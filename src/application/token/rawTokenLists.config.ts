import { RaydiumDevTokenListJsonInfo, RaydiumTokenListJsonInfo, TokenListFetchConfigItemWithMethods } from './type'
import { RAYDIUM_DEV_TOKEN_LIST_NAME, RAYDIUM_MAINNET_TOKEN_LIST_NAME } from './useToken'

const raydiumMainnetTokenListUrl = 'https://api.raydium.io/v2/sdk/token/raydium.mainnet.json'
const customTokenListUrl = '/custom-token-list.json'
export const liquidityMainnetListUrl = 'https://api.raydium.io/v2/sdk/liquidity/mainnet.json'
export const rawTokenListConfigs = [
  {
    url: raydiumMainnetTokenListUrl,
    name: RAYDIUM_MAINNET_TOKEN_LIST_NAME
  },
  {
    url: customTokenListUrl,
    name: RAYDIUM_DEV_TOKEN_LIST_NAME
  }
] as TokenListFetchConfigItemWithMethods[]

export function isRaydiumMainnetTokenListName(response: any, url: string): response is RaydiumTokenListJsonInfo {
  return url === raydiumMainnetTokenListUrl
}

export function isRaydiumDevTokenListName(response: any, url: string): response is RaydiumDevTokenListJsonInfo {
  return url === customTokenListUrl
}
