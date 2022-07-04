import { addItem } from '@/functions/arrayMethods'
import { useIsomorphicLayoutEffect } from '@/hooks/useIsomorphicLayoutEffect '
import { getURLFarmId, getURLFarmTab } from './parseFarmUrl'
import useFarms from './useFarms'

export function useFarmUrlParser() {
  useIsomorphicLayoutEffect(() => {
    const urlFarmId = getURLFarmId()
    if (urlFarmId) {
      useFarms.setState((s) => ({ expandedItemIds: addItem(s.expandedItemIds, urlFarmId), searchText: urlFarmId }))
    }
  }, [])

  useIsomorphicLayoutEffect(() => {
    const urlTab = getURLFarmTab()
    if (urlTab) {
      useFarms.setState({ currentTab: urlTab })
    }
  }, [])
}
