import { useEffect } from 'react'

import useToken from '@/application/token/useToken'
import { RAYMint } from '@/application/token/utils/wellknownToken.config'

import useLiquidity from '../useLiquidity'
import { QuantumSOLVersionSOL } from '@/application/token/utils/quantumSOL'
import toPubString from '@/functions/format/toMintString'

export default function useLiquidityInitCoinFiller() {
  const getToken = useToken((s) => s.getToken)
  useEffect(() => {
    setTimeout(() => {
      // NOTE this effect must later than ammid parser
      const { coin1, coin2, ammId } = useLiquidity.getState()
      const isNotReady = Boolean(ammId && !coin1 && !coin2)
      if (isNotReady) return
      if (!coin1 && toPubString(coin2?.mint) !== toPubString(QuantumSOLVersionSOL.mint)) {
        useLiquidity.setState({ coin1: QuantumSOLVersionSOL })
      }
      if (!coin2 && toPubString(coin1?.mint) !== toPubString(RAYMint)) {
        useLiquidity.setState({ coin2: getToken(RAYMint) })
      }
    })
  }, [getToken])
}
