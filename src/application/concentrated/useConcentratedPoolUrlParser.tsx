import { addItem } from '@/functions/arrayMethods'
import useInit from '@/hooks/useInit'

import { getURLConcentratedPoolId } from './parserConcentratedPoolUrl'
import useConcentrated from './useConcentrated'

export function useConcentratedPoolUrlParser() {
  useInit(
    () => {
      const urlAmmId = getURLConcentratedPoolId()
      if (urlAmmId) {
        useConcentrated.setState((s) => ({
          expandedItemIds: addItem(s.expandedItemIds, urlAmmId),
          searchText: urlAmmId
        }))
      }
    },
    { effectMethod: 'isoLayoutEffect' }
  )
}
