import { shakeFalsyItem } from '@/functions/arrayMethods'
import toPubString from '@/functions/format/toMintString'
import { HydratedPoolItemInfo } from './type'

// for search
export function getPoolItemSignature(pool: HydratedPoolItemInfo) {
  return shakeFalsyItem([
    pool.name,
    toPubString(pool.base?.mint),
    toPubString(pool.quote?.mint),
    pool.ammId,
    pool.market,
    pool.lpMint
  ]).join('-')
}
