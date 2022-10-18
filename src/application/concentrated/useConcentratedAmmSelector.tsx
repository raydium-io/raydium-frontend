import { isMintEqual } from '@/functions/judgers/areEqual'
import { useEffect } from 'react'
import useConcentrated from './useConcentrated'

/** coin1 coin2 ammId */
export default function useConcentratedAmmSelector(notCleanPool?: boolean) {
  const coin1 = useConcentrated((s) => s.coin1)
  const coin2 = useConcentrated((s) => s.coin2)
  const hydratedAmmPools = useConcentrated((s) => s.hydratedAmmPools)

  useEffect(() => {
    !notCleanPool &&
      useConcentrated.setState({
        currentAmmPool: undefined
      })
    if (!hydratedAmmPools.length || !coin1 || !coin2) {
      useConcentrated.setState({
        selectableAmmPools: undefined,
        currentAmmPool: undefined
      })
      return
    }
    const allSelectablePools = hydratedAmmPools.filter(
      (p) =>
        (isMintEqual(p.state.mintA.mint, coin1.mint) && isMintEqual(p.state.mintB.mint, coin2.mint)) ||
        (isMintEqual(p.state.mintA.mint, coin2.mint) && isMintEqual(p.state.mintB.mint, coin1.mint))
    )
    useConcentrated.setState(
      notCleanPool
        ? { selectableAmmPools: allSelectablePools }
        : {
            selectableAmmPools: allSelectablePools,
            currentAmmPool: allSelectablePools[allSelectablePools.length - 1]
          }
    )
  }, [coin1, coin2, hydratedAmmPools, notCleanPool])
}
