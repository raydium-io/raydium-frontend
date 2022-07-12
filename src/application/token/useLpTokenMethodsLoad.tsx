import toPubString from '@/functions/format/toMintString'
import { isMintEqual } from '@/functions/judgers/areEqual'
import { PublicKeyish } from '@/types/constants'
import { useEffect } from 'react'
import { QuantumSOLVersionSOL, QuantumSOLVersionWSOL, SOLUrlMint, WSOLMint } from './quantumSOL'
import { SplToken } from './type'
import useToken from './useToken'
import { SOLMint } from './wellknownToken.config'

export function useLpTokenMethodsLoad() {
  const lpTokens = useToken((s) => s.lpTokens)
  const tokens = useToken((s) => s.tokens)
  const userAddedTokens = useToken((s) => s.userAddedTokens)

  /** NOTE -  getToken place 2 */
  useEffect(() => {
    function getToken(mint: PublicKeyish | undefined, options?: { exact?: boolean }): SplToken | undefined {
      if (mint === SOLUrlMint || isMintEqual(mint, SOLMint) || (!options?.exact && isMintEqual(mint, WSOLMint))) {
        return QuantumSOLVersionSOL
      }
      if (options?.exact && isMintEqual(mint, WSOLMint)) {
        return QuantumSOLVersionWSOL
      }
      return tokens[String(mint)] ?? lpTokens[toPubString(mint)] ?? userAddedTokens[toPubString(mint)]
    }
    useToken.setState({ getToken })
  }, [lpTokens])
  const pureTokens = useToken((s) => s.pureTokens)

  useEffect(() => {
    function getPureToken(mint: PublicKeyish | undefined): SplToken | undefined {
      return pureTokens[String(mint)] ?? lpTokens[toPubString(mint)] ?? userAddedTokens[toPubString(mint)]
    }

    useToken.setState({ getPureToken })
  }, [lpTokens])
}
