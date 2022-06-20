import { shakeFalsyItem } from '@/functions/arrayMethods'
import toPubString from '@/functions/format/toMintString'
import { HydratedIdoInfo } from './type'

// for search
export function getIdoItemSignature(pool: HydratedIdoInfo) {
  return shakeFalsyItem([
    pool.projectName,

    toPubString(pool.base?.mint),
    toPubString(pool.quote?.mint),
    pool.base?.symbol,
    pool.quote?.symbol,

    pool.id
  ]).join('-')
}
