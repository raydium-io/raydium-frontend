import assert from '@/functions/assert'
import jFetch from '@/functions/dom/jFetch'
import { Config } from './type'

// this will increase only when there is an error on fetch raydium api
let fetchingAttemptsCount = 0
/** this will get rpc info from https://api.raydium.io/ */
export default async function fetchRpcConfigs(appVersion: string): Promise<Config> {
  try {
    fetchingAttemptsCount = 0
    const responseConfig = await jFetch(`https://api.raydium.io/v2/main/config?v=${appVersion}`, {
      ignoreCache: true
    })
    if (!responseConfig) {
      throw new Error('no response')
    }
    return responseConfig
  } catch (e) {
    if (++fetchingAttemptsCount > 5) {
      throw new Error('give up 😂.Tried 5 times. Maybe network Error')
    } else {
      return fetchRpcConfigs(appVersion)
    }
  }
}
