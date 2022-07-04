import { isValidPublicKey } from '@/functions/judgers/dateType'
import { inClient } from '@/functions/judgers/isSSR'

export function getURLFarmTab(): 'Raydium' | 'Fusion' | 'Ecosystem' | 'Inactive' | undefined {
  const query = getURLQuery()
  const urlTab = String(query.tab ?? '') || undefined
  const parsed =
    urlTab === 'Fusion'
      ? 'Fusion'
      : urlTab === 'Ecosystem'
      ? 'Ecosystem'
      : urlTab === 'Inactive'
      ? 'Inactive'
      : 'Raydium'
  return parsed
}

export function getURLFarmId(): string | undefined {
  const query = getURLQuery()
  const urlFarmId = String(query.farmId ?? query.farmid ?? '') || undefined
  return isValidPublicKey(urlFarmId) ? urlFarmId : undefined
}

export function getURLQuery(): Record<string, string | undefined> {
  if (!inClient) return {}
  const searchText = window.location.search
  const searchQuery = searchText
    ? Object.fromEntries(
        searchText
          .slice(1)
          .split('&')
          .map((pair: string) => pair.split('='))
      )
    : {}
  return searchQuery
}
