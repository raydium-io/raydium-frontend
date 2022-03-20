import { Config } from './fetchRPCConfig'
import { forceWindowRefresh } from './forceWindowRefresh'

export const APP_VERSION = '1.1.0'

export default function assertAppVersion(config: Config, errorCallback: (error: unknown) => void) {
  if (!config.success) {
    errorCallback('the version check failed')
    forceWindowRefresh()
  }
}
