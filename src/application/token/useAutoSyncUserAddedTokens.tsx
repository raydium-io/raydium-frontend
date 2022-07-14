import { shakeUndifindedItem } from '@/functions/arrayMethods'
import asyncMap from '@/functions/asyncMap'
import listToMap from '@/functions/format/listToMap'
import toPubString from '@/functions/format/toMintString'
import { omit } from '@/functions/objectMethods'
import useLocalStorageItem from '@/hooks/useLocalStorage'
import { useEffect } from 'react'
import { useStoppableEffect } from '../../hooks/useStoppableEffect'
import useConnection from '../connection/useConnection'
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

  const [userAddedTokensInLocalStorage, setUserAddedTokensInLocalStorage] = useLocalStorageItem<
    Omit<TokenJson, 'decimals'>[] | 'not-loaded'
  >('USER_ADDED_TOKENS', { defaultValue: 'not-loaded' })

  const connection = useConnection((s) => s.connection)

  useStoppableEffect(
    (stopFn) => {
      if (userAddedTokensInLocalStorage !== 'not-loaded' && connection) {
        stopFn()
        if (userAddedTokensInLocalStorage?.length) {
          getTokenFromLocalStorage(userAddedTokensInLocalStorage).then((tokens) => {
            const localStoragedTokens = listToMap(shakeUndifindedItem(tokens), (i) => toPubString(i.mint))
            useToken.setState((s) => ({
              userAddedTokens: { ...localStoragedTokens },
              tokens: { ...s.tokens, ...localStoragedTokens }
            }))
          })
        }
      }
    },
    [userAddedTokens, connection]
  )

  useEffect(() => {
    if (!connection) return
    const userAddedTokensInJS = Object.values(userAddedTokens).map((splToken) => toSplTokenInfo(splToken))
    // console.log('userAddedTokensInJS: ', userAddedTokensInJS)
    // console.log('userAddedTokensInLocalStorage: ', userAddedTokensInLocalStorage)

    // // init get token from local storage
    // if (!userAddedTokensInJS.length && userAddedTokensInLocalStorage?.length) {
    //   getTokenFromLocalStorage(userAddedTokensInLocalStorage).then((tokens) => {
    //     const localStoragedTokens = listToMap(shakeUndifindedItem(tokens), (i) => toPubString(i.mint))
    //     console.log('localStoragedTokens: ', localStoragedTokens)
    //     useToken.setState((s) => ({
    //       userAddedTokens: { ...s.userAddedTokens, ...localStoragedTokens }
    //     }))
    //   })
    // } else
    if (userAddedTokensInJS.length) {
      // js info first !!!
      setUserAddedTokensInLocalStorage(userAddedTokensInJS.map((userAddedToken) => omit(userAddedToken, 'decimals')))
    }
  }, [userAddedTokens && connection])
}

export async function getTokenFromLocalStorage(localStorageTokens: { mint: string }[]) {
  const localStorageTokenMints = localStorageTokens.map((token) => token.mint)
  const tokenDecimals = await asyncMap(localStorageTokenMints, (mint) => getOnlineTokenDecimals(mint))
  const tokens = tokenDecimals.map((decimals, idx) =>
    decimals ? createSplToken({ ...localStorageTokens[idx], decimals, userAdded: true }) : undefined
  )
  return tokens
}
