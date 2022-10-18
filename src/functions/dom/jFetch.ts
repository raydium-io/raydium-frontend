import { useAppVersion } from '@/application/common/useAppVersion'
import { MayPromise } from '@/types/constants'

import assert from '../assert'
import { isString } from '../judgers/dateType'

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

/**
 * same interface as original fetch, but, customized version have cache
 */
// TODO: unexceptedly cache useless all response, even ignoreCache
export async function tryFetch(input: RequestInfo, options?: TryFetchOptions): Promise<string | undefined> {
  const key =
    typeof input === 'string' ? input + options?.body?.toString() ?? '' : input.url + options?.body?.toString() ?? ''

  const useStrongCache = resultCache.has(key) && Date.now() - resultCache.get(key)!.reponseTime < 2000
  if (useStrongCache) {
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
      const response = key.includes('api.raydium.io')
        ? fetch(input, { ...options, headers: { ...options?.headers, 'ui-version': currentVersion } })
        : fetch(input, options) // add version for debug
      resultCache.set(key, {
        rawText: response
          .then((r) => r.clone())
          .then((r) => r.text())
          .catch(() => undefined),
        reponseTime: Date.now()
      })
      if (!(await response).ok) {
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
