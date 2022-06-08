import { RaydiumDevTokenListJsonInfo, RaydiumTokenListJsonInfo, TokenListFetchConfigItemWithMethods } from './type'
import { RAYDIUM_DEV_TOKEN_LIST_NAME, RAYDIUM_MAINNET_TOKEN_LIST_NAME } from './useToken'

export const rawTokenListConfigs = [
  {
    url: 'https://api.raydium.io/v2/sdk/token/raydium.mainnet.json',
    name: RAYDIUM_MAINNET_TOKEN_LIST_NAME
  },
  {
    url: '/custom-token-list.json',
    name: RAYDIUM_DEV_TOKEN_LIST_NAME
  }
] as TokenListFetchConfigItemWithMethods[]

export function isRaydiumMainnetTokenListName(response: any): response is RaydiumTokenListJsonInfo {
  return response?.name === 'Raydium Mainnet Token List'
}

export function isRaydiumDevTokenListName(response: any): response is RaydiumDevTokenListJsonInfo {
  return response?.name === RAYDIUM_DEV_TOKEN_LIST_NAME
}
