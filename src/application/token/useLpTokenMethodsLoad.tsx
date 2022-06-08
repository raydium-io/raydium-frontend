import { useEffect } from 'react'
import toPubString from '@/functions/format/toMintString'
import { PublicKeyish } from '@/types/constants'
import useToken from './useToken'
import { SplToken } from './type'
import { SOLUrlMint, QuantumSOLVersionSOL, WSOLMint, QuantumSOLVersionWSOL } from './quantumSOL'
import { min } from 'bn.js'

export function useLpTokenMethodsLoad() {
  const lpTokens = useToken((s) => s.lpTokens)
  const tokens = useToken((s) => s.tokens)
  const userAddedTokens = useToken((s) => s.userAddedTokens)

  /** NOTE -  getToken place 2 */
  useEffect(() => {
    function getToken(mint: PublicKeyish | undefined, options?: { exact?: boolean }): SplToken | undefined {
      if (String(mint) === SOLUrlMint) {
        return QuantumSOLVersionSOL
      }
      if (String(mint) === String(WSOLMint) && options?.exact) {
        return QuantumSOLVersionWSOL
      }
      return tokens[String(mint)] ?? lpTokens[toPubString(mint)] ?? userAddedTokens.get(toPubString(mint))
    }
    useToken.setState({ getToken })
  }, [lpTokens])
  const pureTokens = useToken((s) => s.pureTokens)

  useEffect(() => {
    function getPureToken(mint: PublicKeyish | undefined): SplToken | undefined {
      return pureTokens[String(mint)] ?? lpTokens[toPubString(mint)] ?? userAddedTokens.get(toPubString(mint))
    }

    useToken.setState({ getPureToken })
  }, [lpTokens])
}
