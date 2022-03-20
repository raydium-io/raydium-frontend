import { listToJSMap } from '@/functions/format/listToMap'
import toPubString from '@/functions/format/toMintString'
import useLocalStorageItem from '@/hooks/useLocalStorage'
import { useEffect } from 'react'
import { TokenJson } from '../type'
import useToken from '../useToken'
import { createSplToken, toSplTokenInfo } from './useTokenListsLoader'

/**
 * will parse user added tokens in localStorage
 * and record userToken(s=>s.userAddedTokens) to localStorage
 */

export function useAutoSyncUserAddedTokens() {
  const userAddedTokens = useToken((s) => s.userAddedTokens)

  const [userAddedTokensInLocalStorage, setUserAddedTokensInLocalStorage] =
    useLocalStorageItem<TokenJson[]>('USER_ADDED_TOKENS')

  useEffect(() => {
    const userAddedTokensInJS = [...userAddedTokens.values()].map((splToken) => toSplTokenInfo(splToken))
    if (!userAddedTokensInJS.length && userAddedTokensInLocalStorage?.length) {
      useToken.setState({
        userAddedTokens: listToJSMap(
          userAddedTokensInLocalStorage.map((tokenInfo) => tokenInfo && createSplToken(tokenInfo)),
          (i) => toPubString(i.mint)
        )
      })
    } else if (userAddedTokensInJS.length) {
      // js info first !!!
      setUserAddedTokensInLocalStorage(userAddedTokensInJS)
    }
  }, [userAddedTokens])
}
