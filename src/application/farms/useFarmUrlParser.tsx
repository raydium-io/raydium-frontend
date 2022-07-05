import { addItem } from '@/functions/arrayMethods'
import useInit from '@/hooks/useInit'
import { getURLFarmId } from './parseFarmUrl'
import useFarms from './useFarms'

export function useFarmUrlParser() {
  useInit(
    () => {
      const urlFarmId = getURLFarmId()
      if (urlFarmId) {
        useFarms.setState((s) => ({ expandedItemIds: addItem(s.expandedItemIds, urlFarmId), searchText: urlFarmId }))
      }
    },
    { effectMethod: 'isoLayoutEffect' }
  )
}
