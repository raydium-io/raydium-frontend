import { shakeUndifindedItem } from '@/functions/arrayMethods'
import asyncMap from '@/functions/asyncMap'
import listToMap, { listToJSMap } from '@/functions/format/listToMap'
import toPubString from '@/functions/format/toMintString'
import { objectMap, objectShakeNil, omit } from '@/functions/objectMethods'
import useLocalStorageItem from '@/hooks/useLocalStorage'
import { useEffect } from 'react'
import { getOnlineTokenDecimals } from './getOnlineTokenInfo'
import { TokenJson } from './type'
import useToken from './useToken'
import { createSplToken, toSplTokenInfo } from './useTokenListsLoader'

/**
 * will parse user added tokens in localStorage
 * and record userToken(s=>s.userAddedTokens) to localStorage
 */

export function useAutoSyncUserAddedTokens() {
  const userAddedTokens = useToken((s) => s.userAddedTokens)

  const [userAddedTokensInLocalStorage, setUserAddedTokensInLocalStorage] =
    useLocalStorageItem<Omit<TokenJson, 'decimals'>[]>('USER_ADDED_TOKENS')

  useEffect(() => {
    const userAddedTokensInJS = Object.values(userAddedTokens).map((splToken) => toSplTokenInfo(splToken))

    // init get token from local storage
    if (!userAddedTokensInJS.length && userAddedTokensInLocalStorage?.length) {
      getTokenFromLocalStorage(userAddedTokensInLocalStorage).then((tokens) => {
        useToken.setState({
          userAddedTokens: listToMap(shakeUndifindedItem(tokens), (i) => toPubString(i.mint))
        })
      })
    } else if (userAddedTokensInJS.length) {
      // js info first !!!
      setUserAddedTokensInLocalStorage(userAddedTokensInJS.map((userAddedToken) => omit(userAddedToken, 'decimals')))
    }
  }, [userAddedTokens])
}

async function getTokenFromLocalStorage(localStorageTokens: Omit<TokenJson, 'decimals'>[]) {
  const localStorageTokenMints = localStorageTokens.map((token) => token.mint)
  const tokenDecimals = await asyncMap(localStorageTokenMints, (mint) => getOnlineTokenDecimals(mint))
  const tokens = tokenDecimals.map((decimals, idx) =>
    decimals ? createSplToken({ ...localStorageTokens[idx], decimals }) : undefined
  )
  return tokens
}
