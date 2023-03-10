import useConcentrated from '@/application/concentrated/useConcentrated'
import { usePools } from '@/application/pools/usePools'
import { getLocalItem } from '@/functions/dom/jStorage'
import useInit from '@/hooks/useInit'

export function usePoolFilterLoader() {
  useInit(() => {
    const filterTarget = getLocalItem('value-filter-target')
    const filterMax = getLocalItem('value-filter-max')
    const filterMin = getLocalItem('value-filter-min')

    if (filterTarget) {
      usePools.setState({ filterTarget, filterMax, filterMin })
    }
  })
}
