import { useCallback, useEffect } from 'react'

import toPubString from '@/functions/format/toMintString'
import { isMintEqual } from '@/functions/judgers/areEqual'

import { HydratedConcentratedInfo } from './type'
import useConcentrated from './useConcentrated'

/** coin1 coin2 ammId */
export default function useConcentratedAmmSelector(notCleanPool?: boolean) {
  const coin1 = useConcentrated((s) => s.coin1)
  const coin2 = useConcentrated((s) => s.coin2)
  const hydratedAmmPools = useConcentrated((s) => s.hydratedAmmPools)
  const currentAmmPool = useConcentrated((s) => s.currentAmmPool)

  const checkCurrentPoolSelectable = useCallback(
    (allSelectablePools: HydratedConcentratedInfo[]) => {
      const result =
        currentAmmPool !== undefined &&
        allSelectablePools.filter((p) => toPubString(p.state.id) === currentAmmPool.idString).length === 1
      return result
    },
    [currentAmmPool]
  )

  useEffect(() => {
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

    const currentPoolIsSelectable = checkCurrentPoolSelectable(allSelectablePools)

    useConcentrated.setState(
      notCleanPool || currentPoolIsSelectable
        ? { selectableAmmPools: allSelectablePools }
        : {
            selectableAmmPools: allSelectablePools,
            currentAmmPool: undefined
          }
    )
  }, [coin1, coin2, hydratedAmmPools, notCleanPool, checkCurrentPoolSelectable])
}
