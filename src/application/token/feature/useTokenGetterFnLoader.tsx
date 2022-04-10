import { useEffect } from 'react'
import toPubString from '@/functions/format/toMintString'
import { PublicKeyish } from '@/types/constants'
import { SplToken } from '../type'
import useToken from '../useToken'
import { QuantumSOLVersionSOL, QuantumSOLVersionWSOL, SOLUrlMint, WSOLMint } from '../utils/quantumSOL'

export function useTokenGetterFnLoader() {
  const tokens = useToken((s) => s.tokens)
  const pureTokens = useToken((s) => s.pureTokens)
  const userAddedTokens = useToken((s) => s.userAddedTokens)

  /** NOTE -  getToken place 3 */
  useEffect(() => {
    /** exact mode: 'so111111112' will be QSOL-WSOL 'sol' will be QSOL-SOL */
    function getToken(mint: PublicKeyish | undefined, options?: { exact?: boolean }): SplToken | undefined {
      if (String(mint) === SOLUrlMint) {
        return QuantumSOLVersionSOL
      }
      if (String(mint) === String(WSOLMint) && options?.exact) {
        return QuantumSOLVersionWSOL
      }
      return tokens[String(mint)] ?? userAddedTokens.get(toPubString(mint))
    }

    function getPureToken(mint: PublicKeyish | undefined): SplToken | undefined {
      return pureTokens[String(mint)] ?? userAddedTokens.get(toPubString(mint))
    }

    useToken.setState({
      getToken,
      getPureToken
    })
  }, [tokens, pureTokens, userAddedTokens])
}
