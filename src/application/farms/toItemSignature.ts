import { shakeFalsyItem } from '@/functions/arrayMethods'
import toPubString from '@/functions/format/toMintString'
import { HydratedFarmInfo } from './type'

// for search
export function getFarmItemSignature(farm: HydratedFarmInfo) {
  return shakeFalsyItem([
    farm.name,

    toPubString(farm.base?.mint),
    toPubString(farm.quote?.mint),
    farm.base?.symbol,
    farm.quote?.symbol,

    farm.ammId,
    farm.id,
    farm.rewards.map((r) => [r.owner, toPubString(r.token?.mint), r.token?.symbol]).join('-')
  ]).join('-')
}
