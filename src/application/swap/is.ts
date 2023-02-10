import { ApiPoolInfoItem } from '@raydium-io/raydium-sdk'

export function isApiPoolInfoItem(info: any): info is ApiPoolInfoItem {
  return 'marketId' in info
}
