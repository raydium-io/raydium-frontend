import { addItem } from '@/functions/arrayMethods'
import { isValidPublicKey } from '@/functions/judgers/dateType'
import { useIsomorphicLayoutEffect } from '@/hooks/useIsomorphicLayoutEffect '
import { useRouter } from 'next/router'
import useFarms from './useFarms'

export function useFarmUrlParser() {
  const { query } = useRouter()
  const urlFarmId = String(query.farmId ?? query.farmid ?? '') || undefined
  const urlTab = String(query.tab ?? '') || undefined

  useIsomorphicLayoutEffect(() => {
    if (isValidPublicKey(urlFarmId)) {
      useFarms.setState((s) => ({ expandedItemIds: addItem(s.expandedItemIds, urlFarmId), searchText: urlFarmId }))
    }
    if (urlTab) {
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
      useFarms.setState({ currentTab: parsed })
    }
  }, [urlFarmId, urlTab])
}
