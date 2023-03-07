import useConcentrated from '@/application/concentrated/useConcentrated'
import { usePools } from '@/application/pools/usePools'
import { getLocalItem } from '@/functions/dom/jStorage'
import useInit from '@/hooks/useInit'

export function usePoolTimeBasisLoader() {
  useInit(() => {
    const localTimebasis = getLocalItem('ui-time-basis')
    if (localTimebasis) {
      useConcentrated.setState({ timeBasis: localTimebasis })
      usePools.setState({ timeBasis: localTimebasis })
    }
  })
}
