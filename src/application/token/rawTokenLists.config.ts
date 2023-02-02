import useAppAdvancedSettings from '../common/useAppAdvancedSettings'
import {
  RaydiumDevTokenListJsonInfo,
  RaydiumTokenListJsonInfo,
  TokenListConfigType,
  TokenListFetchConfigItem
} from './type'

export const getLiquidityMainnetListUrl = () => useAppAdvancedSettings.getState().apiUrls.poolInfo
const getCustomTokenListUrl = () => '/custom-token-list.json'
const getRaydiumMainnetTokenListUrl = () => useAppAdvancedSettings.getState().apiUrls.tokenInfo
const getClmmPoolListUrl = () => useAppAdvancedSettings.getState().apiUrls.ammV3Pools // note: previously Rudy has Test API for dev

export const rawTokenListConfigs = [
  {
    url: getRaydiumMainnetTokenListUrl,
    type: TokenListConfigType.RAYDIUM_MAIN
  },
  {
    url: getLiquidityMainnetListUrl,
    type: TokenListConfigType.LIQUIDITY_V2 // this can compose lp token
  },
  {
    url: getClmmPoolListUrl,
    type: TokenListConfigType.LIQUIDITY_V3 // this can compose lp token
  }
] as TokenListFetchConfigItem[]

export function isRaydiumMainnetTokenListName(response: any, url: () => string): response is RaydiumTokenListJsonInfo {
  return url() === getRaydiumMainnetTokenListUrl()
}

export function isRaydiumDevTokenListName(response: any, url: () => string): response is RaydiumDevTokenListJsonInfo {
  return url() === getCustomTokenListUrl()
}
