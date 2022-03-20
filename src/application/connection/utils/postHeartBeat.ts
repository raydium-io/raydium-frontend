import assertAppVersion from './assertAppVersion'
import fetchRpcConfigs from './fetchRPCConfig'

const CHECKING_DELAY_TIME = 1000 * 60 * 5

export default function postHeartBeat(appVersion: string, reportError: () => void) {
  setInterval(async () => {
    if ('document' in globalThis && document.visibilityState === 'hidden') return
    const config = await fetchRpcConfigs(appVersion)
    assertAppVersion(config, reportError)
  }, CHECKING_DELAY_TIME)
}
