import { MayPromise } from '@/types/constants'

import assert from '../assert'
import { isString } from '../judgers/dateType'

// TODO: feture: use standard server-worker instead. see (https://developers.google.com/web/fundamentals/primers/service-workers)
type ResourceUrl = string
type TryFetchOptions = RequestInit & {
  /** this will ignore cache. force to send request. the result will refresh the  */
  ignoreCache?: boolean
  /** if cache is fresh, use cache. */
  cacheFreshTime?: number
}
type JFetchOptions = {
  /** usually it's for data rename  */
  beforeJson?: (data: any) => MayPromise<any>
  /** usually it's for data reshape  */
  afterJson?: (data: any) => MayPromise<any>
} & TryFetchOptions

// TODO: should have concept of out of date
const resultCache = new Map<ResourceUrl, { rawText: string; reponseTime: number }>()

/**
 * same interface as original fetch, but, customized version have cache
 */
export default async function jFetch<Shape = any>(
  input: RequestInfo,
  options?: JFetchOptions
): Promise<Shape | undefined> {
  const key = typeof input === 'string' ? input : input.url
  const rawText = await tryFetch(input, options)
  if (key.includes('raydium.io') && !rawText) {
    // eslint-disable-next-line no-debugger
    debugger // TEMPly let it done
  }

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
  try {
    const key = typeof input === 'string' ? input : input.url
    const canUseCache =
      resultCache.has(key) &&
      !options?.ignoreCache &&
      (options?.cacheFreshTime ? Date.now() - resultCache.get(key)!.reponseTime < options.cacheFreshTime : true)

    if (!canUseCache) {
      const response = fetch(input, options)
      if (!(await response).ok) return undefined

      const rawText = await response
        .then((r) => r.text())
        .catch((e) => {
          console.error(e)
        })
      assert(isString(rawText))
      resultCache.set(key, { rawText, reponseTime: Date.now() })
      return rawText
    } else {
      return resultCache.get(key)?.rawText
    }
  } catch (e) {
    return Promise.resolve(undefined)
  }
}
