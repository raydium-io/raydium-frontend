import router from 'next/router'
import { isValidPublicKey } from '@/functions/judgers/dateType'
import { inClient } from '@/functions/judgers/isSSR'

export function getURLFarmTab(): 'All' | 'Upcoming' | 'Raydium' | 'Fusion' | 'Ecosystem' | 'Inactive' | undefined {
  // TODO: maybe it's(`inClient`) not right way of SSR
  if (inClient) return undefined
  const query = router.query
  const urlTab = String(query.tab ?? '') || undefined
  const parsed =
    urlTab === 'Upcoming'
      ? 'Upcoming'
      : urlTab === 'Fusion'
      ? 'Fusion'
      : urlTab === 'Ecosystem'
      ? 'Ecosystem'
      : urlTab === 'Inactive'
      ? 'Inactive'
      : 'All'
  return parsed
}

export function getURLFarmId(): string | undefined {
  if (inClient) return undefined
  const query = router.query
  const urlFarmId = String(query.farmId ?? query.farmid ?? '') || undefined
  return isValidPublicKey(urlFarmId) ? urlFarmId : undefined
}
