import { addItem } from '@/functions/arrayMethods'
import { isValidPublicKey } from '@/functions/judgers/dateType'
import { useRouter } from 'next/router'
import { useEffect } from 'react'
import useFarms from './useFarms'

export function useFarmUrlParser() {
  const farmHydratedInfos = useFarms((s) => s.hydratedInfos)
  const { query } = useRouter()
  const urlFarmId = String(query.farmId ?? query.farmid ?? '') || undefined
  const urlTab = String(query.tab ?? '') || undefined

  useEffect(() => {
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
  }, [farmHydratedInfos, urlFarmId, urlTab])
}
