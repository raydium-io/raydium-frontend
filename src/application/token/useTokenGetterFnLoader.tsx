import { useEffect } from 'react'

import toPubString from '@/functions/format/toMintString'
import { isMintEqual } from '@/functions/judgers/areEqual'
import { PublicKeyish } from '@/types/constants'

import { QuantumSOLVersionSOL, QuantumSOLVersionWSOL, SOLUrlMint, WSOLMint } from './quantumSOL'
import { SplToken } from './type'
import useToken from './useToken'
import { SOLMint } from './wellknownToken.config'

export function useTokenGetterFnLoader() {
  const tokens = useToken((s) => s.tokens)
  const pureTokens = useToken((s) => s.pureTokens)
  const userAddedTokens = useToken((s) => s.userAddedTokens)
  const lpTokens = useToken(
    (s) => s.lpTokens,
    (oldRecord, newRecord) => {
      return Object.keys(oldRecord).length === Object.keys(newRecord).length
    }
  )

  /** NOTE -  set getToken function into useToken store */
  useEffect(() => {
    /** exact mode: 'so111111112' will be QSOL-WSOL 'sol' will be QSOL-SOL */
    function getToken(mint: PublicKeyish | undefined, options?: { exact?: boolean }): SplToken | undefined {
      if (mint === SOLUrlMint || isMintEqual(mint, SOLMint) || (!options?.exact && isMintEqual(mint, WSOLMint))) {
        return QuantumSOLVersionSOL
      }
      if (options?.exact && isMintEqual(mint, WSOLMint)) {
        return QuantumSOLVersionWSOL
      }
      return tokens[toPubString(mint)] ?? userAddedTokens[toPubString(mint)] ?? lpTokens[toPubString(mint)]
    }

    useToken.setState({
      getToken
    })
  }, [tokens, pureTokens, userAddedTokens, lpTokens])
}
