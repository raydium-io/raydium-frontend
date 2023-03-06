import { useAppVersion } from '@/application/common/useAppVersion'
import useNotification from '@/application/notification/useNotification'
import { MayPromise } from '@/types/constants'

import assert from '../assert'
import { isString } from '../judgers/dateType'
import { isInBonsaiTest, isInLocalhost } from '../judgers/isSSR'

// TODO: feture: use standard server-worker instead. see (https://developers.google.com/web/fundamentals/primers/service-workers)
type ResourceUrl = string
type TryFetchOptions = RequestInit & {
  /** this will ignore cache. force to send request. the result will refresh the  */
  ignoreCache?: boolean
  /** if cache is fresh, use cache. default 1000ms */
  cacheFreshTime?: number
}
type JFetchOptions = {
  /** usually it's for data rename  */
  beforeJson?: (data: any) => MayPromise<any>
  /** usually it's for data reshape  */
  afterJson?: (data: any) => MayPromise<any>
} & TryFetchOptions

// TODO: should have concept of out of date
const resultCache = new Map<ResourceUrl, { rawText: Promise<string | undefined>; reponseTime: number }>()

/**
 * same interface as original fetch, but, customized version have cache
 */
export default async function jFetch<Shape = any>(
  input: RequestInfo,
  options?: JFetchOptions
): Promise<Shape | undefined> {
  // if (input === 'https://api.raydium.io/v2/sdk/liquidity/mainnet.json') return new Promise((r) => {})
  const rawText = await tryFetch(input, options)
  if (!rawText) return undefined

  const renamedText = await (options?.beforeJson?.(rawText) ?? rawText)
  if (!renamedText) return undefined
  try {
    const rawJson = JSON.parse(renamedText || '{}')
    const formattedData = await (options?.afterJson?.(rawJson) ?? rawJson)
    return formattedData
  } catch (e) {
    return undefined
  }
}

const maxCostTime = 2 * 1000

// 💩
function onCostLongerThanMaxTime(key: string) {
  if (!key.includes('api.raydium.io')) return
  console.error(`fetch ${key} cost too much time(>${maxCostTime}ms)`)
  if (isInBonsaiTest || isInLocalhost) {
    const { logError } = useNotification.getState()
    logError(`fetch cost too much`, `${key} cost too much time(>${maxCostTime}ms)`)
  }
}

// 💩
function onFetchError(key: string, response: Response) {
  if (!key.includes('api.raydium.io')) return
  console.error(`fetch ${key} error, status: ${response.status}${response.statusText}`)
  if (isInBonsaiTest || isInLocalhost) {
    const { logError } = useNotification.getState()
    logError(`fetch error`, `fetch ${key} error, status: ${response.status || '(none)'}${response.statusText ?? ''}`)
  }
}

/**
 * same interface as original fetch, but, customized version have cache
 */
// TODO: unexceptedly cache useless all response, even ignoreCache
export async function tryFetch(input: RequestInfo, options?: TryFetchOptions): Promise<string | undefined> {
  const key = (typeof input === 'string' ? input : input.url) + (options?.body?.toString() ?? '')
  const useStrongCache = resultCache.has(key) && Date.now() - resultCache.get(key)!.reponseTime < 2000
  if (useStrongCache) {
    // console.info(`(cache) fetch ${key} success`)
    return resultCache.get(key)!.rawText
  }

  try {
    const canUseCache =
      resultCache.has(key) &&
      !options?.ignoreCache &&
      (options?.cacheFreshTime
        ? Date.now() - resultCache.get(key)!.reponseTime < (options.cacheFreshTime ?? 2000)
        : false)
    if (!canUseCache) {
      const { currentVersion } = useAppVersion.getState()

      // log fetch info
      const timoutId = setTimeout(() => onCostLongerThanMaxTime(key), maxCostTime)

      // fetch  core
      const response = (
        key.includes('api.raydium.io')
          ? fetch(input, { ...options, headers: { ...options?.headers, 'ui-version': currentVersion } })
          : fetch(input, options)
      )
        .catch((r) => {
          onFetchError(key, r)
          return r
        }) // add version for debug
        .finally(() => {
          clearTimeout(timoutId)
        })

      resultCache.set(key, {
        rawText: response
          .then((r) => r.clone())
          .then((r) => r.text())
          .catch(() => undefined),
        reponseTime: Date.now()
      })
      if (!(await response).ok) {
        onFetchError(key, await response)
        resultCache.set(key, { rawText: Promise.resolve(undefined), reponseTime: Date.now() })
        return undefined
      }

      const rawText = await response
        .then((r) => r.text())
        .catch((e) => {
          console.error(e)
          return undefined
        })
      assert(isString(rawText))
      resultCache.set(key, { rawText: Promise.resolve(rawText), reponseTime: Date.now() })
      return rawText
    } else {
      return resultCache.get(key)?.rawText
    }
  } catch (e) {
    resultCache.set(key, { rawText: Promise.resolve(undefined), reponseTime: Date.now() })
    return Promise.resolve(undefined)
  }
}
