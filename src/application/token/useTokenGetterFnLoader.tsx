import { useEffect } from 'react'
import toPubString from '@/functions/format/toMintString'
import { PublicKeyish } from '@/types/constants'
import { SplToken } from './type'
import useToken from './useToken'
import { QuantumSOLVersionSOL, QuantumSOLVersionWSOL, SOLUrlMint, WSOLMint } from './quantumSOL'
import { isMintEqual } from '@/functions/judgers/areEqual'
import { SOLMint } from './wellknownToken.config'

export function useTokenGetterFnLoader() {
  const tokens = useToken((s) => s.tokens)
  const pureTokens = useToken((s) => s.pureTokens)
  const userAddedTokens = useToken((s) => s.userAddedTokens)

  /** NOTE -  getToken place 3 */
  useEffect(() => {
    /** exact mode: 'so111111112' will be QSOL-WSOL 'sol' will be QSOL-SOL */
    function getToken(mint: PublicKeyish | undefined, options?: { exact?: boolean }): SplToken | undefined {
      if (mint === SOLUrlMint || isMintEqual(mint, SOLMint) || (!options?.exact && isMintEqual(mint, WSOLMint))) {
        return QuantumSOLVersionSOL
      }
      if (options?.exact && isMintEqual(mint, WSOLMint)) {
        return QuantumSOLVersionWSOL
      }
      return tokens[String(mint)] ?? userAddedTokens[toPubString(mint)]
    }

    function getPureToken(mint: PublicKeyish | undefined): SplToken | undefined {
      return pureTokens[String(mint)] ?? userAddedTokens[toPubString(mint)]
    }

    useToken.setState({
      getToken,
      getPureToken
    })
  }, [tokens, pureTokens, userAddedTokens])
}
