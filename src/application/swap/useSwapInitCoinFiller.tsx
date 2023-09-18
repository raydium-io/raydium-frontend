import { useEffect } from 'react'

import useToken from '@/application/token/useToken'
import { RAYMint } from '@/application/token/wellknownToken.config'
import { getURLQueryEntry } from '@/functions/dom/getURLQueryEntries'
import toPubString from '@/functions/format/toMintString'

import { QuantumSOLVersionSOL } from '../token/quantumSOL'

import { useSwap } from './useSwap'
import { getTokenSignature } from '../token/getTokenSignature'

export default function useSwapInitCoinFiller() {
  const tokens = useToken((s) => s.tokens)
  const getToken = useToken((s) => s.getToken)
  const coin1 = useSwap((s) => s.coin1)
  const coin2 = useSwap((s) => s.coin2)

  useEffect(() => {
    const query = getURLQueryEntry()
    const hasInputCurrency = Object.keys(query).includes('inputCurrency')
    const hasOutputCurrency = Object.keys(query).includes('outputCurrency')

    if (!coin1 && coin2?.mintString !== QuantumSOLVersionSOL.mintString && !hasInputCurrency) {
      useSwap.setState({ coin1: QuantumSOLVersionSOL })
    }
    if (!coin2 && coin1?.mintString !== toPubString(RAYMint) && !hasOutputCurrency) {
      useSwap.setState({ coin2: getToken(RAYMint) })
    }
  }, [tokens, getToken, coin1, coin2])

  // update token if needed
  useEffect(() => {
    const newCoin2Token = getToken(coin2?.mintString)
    if (coin2 && getTokenSignature(coin2) !== getTokenSignature(newCoin2Token)) {
      useSwap.setState({ coin2: newCoin2Token })
    }
  }, [tokens, getToken])
}
