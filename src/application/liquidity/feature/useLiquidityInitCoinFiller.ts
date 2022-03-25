import { useEffect } from 'react'

import useToken from '@/application/token/useToken'
import { RAYMint } from '@/application/token/utils/wellknownToken.config'

import useLiquidity from '../useLiquidity'
import { QuantumSOLVersionSOL } from '@/application/token/utils/quantumSOL'
import toPubString from '@/functions/format/toMintString'

export default function useLiquidityInitCoinFiller() {
  const getToken = useToken((s) => s.getToken)
  useEffect(() => {
    const { coin1, coin2 } = useLiquidity.getState()
    if (!coin1 && toPubString(coin2?.mint) !== toPubString(QuantumSOLVersionSOL.mint)) {
      useLiquidity.setState({ coin1: QuantumSOLVersionSOL })
    }
    if (!coin2 && toPubString(coin1?.mint) !== toPubString(RAYMint)) {
      useLiquidity.setState({ coin2: getToken(RAYMint) })
    }
  }, [getToken])
}
