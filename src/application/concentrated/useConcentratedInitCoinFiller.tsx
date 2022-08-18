import { useEffect } from 'react'

import useToken from '@/application/token/useToken'
import { RAYMint } from '@/application/token/wellknownToken.config'

import { QuantumSOLVersionSOL } from '@/application/token/quantumSOL'
import { getURLQueryEntry } from '@/functions/dom/getURLQueryEntries'
import toPubString from '@/functions/format/toMintString'
import useConcentrated from './useConcentrated'

export default function useConcentratedInitCoinFiller() {
  const getToken = useToken((s) => s.getToken)
  useEffect(() => {
    setTimeout(() => {
      // NOTE this effect must later than ammid parser
      const { coin1, coin2, ammId } = useConcentrated.getState()
      const query = getURLQueryEntry()
      const isNotReady = Boolean(ammId && !coin1 && !coin2)
      if (isNotReady) return
      const queryHaveSetCoin = ['coin0', 'coin1', 'ammId'].some((i) => Object.keys(query).includes(i))
      const needFillCoin1 =
        !coin1 && !ammId && toPubString(coin2?.mint) !== toPubString(QuantumSOLVersionSOL.mint) && !queryHaveSetCoin
      if (needFillCoin1) {
        useConcentrated.setState({ coin1: QuantumSOLVersionSOL })
      }
      const needFillCoin2 = !coin2 && !ammId && toPubString(coin1?.mint) !== toPubString(RAYMint) && !queryHaveSetCoin
      if (needFillCoin2) {
        useConcentrated.setState({ coin2: getToken(RAYMint) })
      }
    }, 100)
  }, [getToken])
}
