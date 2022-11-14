import { useEffect } from 'react'
import useToken from './useToken'

export function useTokenGetterFnLoader() {
  const tokens = useToken((s) => s.tokens)
  const pureTokens = useToken((s) => s.pureTokens)
  const userAddedTokens = useToken((s) => s.userAddedTokens)
  const lpTokens = useToken((s) => s.lpTokens)

  useEffect(() => {
    useToken.setState((s) => ({ getToken: s.getToken.bind(undefined) }))
  }, [tokens, pureTokens, userAddedTokens, lpTokens])
}
