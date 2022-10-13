import { useEffect } from 'react'

import useToken from '@/application/token/useToken'
import { RAYMint } from '@/application/token/wellknownToken.config'
import { getURLQueryEntry } from '@/functions/dom/getURLQueryEntries'
import toPubString from '@/functions/format/toMintString'

import { QuantumSOLVersionSOL } from '../token/quantumSOL'

import { useSwap } from './useSwap'

export default function useSwapInitCoinFiller() {
  const getToken = useToken((s) => s.getToken)
  const coin1 = useSwap((s) => s.coin1)
  const coin2 = useSwap((s) => s.coin2)

  useEffect(() => {
    const query = getURLQueryEntry()
    const hasInputCurrency = Object.keys(query).includes('inputCurrency')
    const hasOutputCurrency = Object.keys(query).includes('outputCurrency')

    if (!coin1 && toPubString(coin2?.mint) !== toPubString(QuantumSOLVersionSOL.mint) && !hasInputCurrency) {
      useSwap.setState({ coin1: QuantumSOLVersionSOL })
    }
    if (!coin2 && toPubString(coin1?.mint) !== toPubString(RAYMint) && !hasOutputCurrency) {
      useSwap.setState({ coin2: getToken(RAYMint) })
    }
  }, [getToken, coin1, coin2])
}
