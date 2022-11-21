import {
  RaydiumDevTokenListJsonInfo, RaydiumTokenListJsonInfo, TokenListConfigType, TokenListFetchConfigItem
} from './type'

const raydiumMainnetTokenListUrl = 'https://api.raydium.io/v2/sdk/token/raydium.mainnet.json'
const customTokenListUrl = '/custom-token-list.json'
export const liquidityMainnetListUrl = 'https://api.raydium.io/v2/sdk/liquidity/mainnet.json'
export const clmmPoolListUrl = 'https://api.raydium.io/v2/ammV3/ammPools' // note: previously Rudy has Test API for dev

export const rawTokenListConfigs = [
  {
    url: raydiumMainnetTokenListUrl,
    type: TokenListConfigType.RAYDIUM_MAIN
  },
  {
    url: customTokenListUrl,
    type: TokenListConfigType.RAYDIUM_DEV // in this version, custom is dev
  },
  {
    url: liquidityMainnetListUrl,
    type: TokenListConfigType.LIQUIDITY_V2
  },
  {
    url: clmmPoolListUrl,
    type: TokenListConfigType.LIQUIDITY_V3
  }
] as TokenListFetchConfigItem[]

export function isRaydiumMainnetTokenListName(response: any, url: string): response is RaydiumTokenListJsonInfo {
  return url === raydiumMainnetTokenListUrl
}

export function isRaydiumDevTokenListName(response: any, url: string): response is RaydiumDevTokenListJsonInfo {
  return url === customTokenListUrl
}
