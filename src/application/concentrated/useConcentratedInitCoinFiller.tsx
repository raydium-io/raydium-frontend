import useToken from '@/application/token/useToken'
import { RAYMint, USDCMint } from '@/application/token/wellknownToken.config'
import { useEffect, useRef } from 'react'
import useConcentrated from './useConcentrated'

export default function useConcentratedInitCoinFiller() {
  const getToken = useToken((s) => s.getToken)
  const tokens = useToken((s) => s.tokens)
  const hasInited = useRef(false)
  useEffect(() => {
    const { coin1, coin2, currentAmmPool } = useConcentrated.getState()
    if (!Object.keys(tokens).length) return
    if (hasInited.current) return
    hasInited.current = true
    if (coin1 || coin2) return // no need assign for user if already assigned
    if (currentAmmPool) {
      useConcentrated.setState({ coin1: currentAmmPool.base, coin2: currentAmmPool.quote })
    } else {
      useConcentrated.setState({ coin1: getToken(RAYMint), coin2: getToken(USDCMint) })
    }
  }, [tokens])
}
