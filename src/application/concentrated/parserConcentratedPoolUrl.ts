import { isValidPublicKey } from '@/functions/judgers/dateType'

import { getURLQueryEntry } from '../../functions/dom/getURLQueryEntries'

export function getURLConcentratedPoolId(): string | undefined {
  const query = getURLQueryEntry()
  const urlAmmId = String(query.ammId ?? query.ammid ?? '') || undefined
  return isValidPublicKey(urlAmmId) ? urlAmmId : undefined
}
