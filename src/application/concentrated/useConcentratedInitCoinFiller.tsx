import useToken from '@/application/token/useToken'
import { useEffect } from 'react'
import useConcentrated from './useConcentrated'

export default function useConcentratedInitCoinFiller() {
  const getToken = useToken((s) => s.getToken)
  const tokens = useToken((s) => s.tokens)
  useEffect(() => {
    const { coin1, coin2, currentAmmPool } = useConcentrated.getState()
    if (coin1 || coin2) return // no need assign for user if already assigned
    if (!Object.keys(tokens).length) return
    if (currentAmmPool) {
      useConcentrated.setState({ coin1: currentAmmPool.base, coin2: currentAmmPool.quote })
    } else {
      // as user can only enter by 'create-position' button, no need fill ray usdc
      // useConcentrated.setState({ coin1: getToken(RAYMint), coin2: getToken(USDCMint) })
    }
  }, [tokens])
}
