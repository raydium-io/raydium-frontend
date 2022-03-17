import { useEffect } from 'react'
import toPubString from '@/functions/format/toMintString'
import { PublicKeyish } from '@/types/constants'
import useToken from '../useToken'

export function useLpTokenMethodsLoad() {
  const lpTokens = useToken((s) => s.lpTokens)
  const tokens = useToken((s) => s.tokens)
  useEffect(() => {
    useToken.setState({
      getToken: (mintish: PublicKeyish) => tokens[toPubString(mintish)] || lpTokens[toPubString(mintish)]
    })
  }, [tokens, lpTokens])
  const pureTokens = useToken((s) => s.pureTokens)
  useEffect(() => {
    useToken.setState({
      getPureToken: (mintish: PublicKeyish) => pureTokens[toPubString(mintish)] || lpTokens[toPubString(mintish)]
    })
  }, [pureTokens, lpTokens])
}
