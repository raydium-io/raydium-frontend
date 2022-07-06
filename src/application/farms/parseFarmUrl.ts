import { isValidPublicKey } from '@/functions/judgers/dateType'
import { getURLQueryEntry } from '../../functions/dom/getURLQueryEntries'

export function getURLFarmId(): string | undefined {
  const query = getURLQueryEntry()
  const urlFarmId = String(query.farmId ?? query.farmid ?? '') || undefined
  return isValidPublicKey(urlFarmId) ? urlFarmId : undefined
}
