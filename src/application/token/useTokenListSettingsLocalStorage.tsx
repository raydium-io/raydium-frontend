import { useEffect } from 'react'

import { getLocalItem, setLocalItem } from '@/functions/dom/jStorage'

import { shakeUndifindedItem } from '@/functions/arrayMethods'
import listToMap from '@/functions/format/listToMap'
import toPubString from '@/functions/format/toMintString'
import { objectMap, omit } from '@/functions/objectMethods'
import useAsyncEffect from '@/hooks/useAsyncEffect'
import { SplTokenJsonInfo } from '@raydium-io/raydium-sdk'
import useConnection from '../connection/useConnection'
import { getTokenFromLocalStorage } from './getTokenFromLocalStorage'
import { SOLANA_TOKEN_LIST_NAME, USER_ADDED_TOKEN_LIST_NAME, useToken } from './useToken'

export default function useTokenListSettingsLocalStorage() {
  const connection = useConnection((s) => s.connection)

  // whenever app start , get tokenListSettings from localStorage
  useAsyncEffect(async () => {
    const userAddedTokens = getLocalItem<SplTokenJsonInfo[]>('TOKEN_LIST_USER_ADDED_TOKENS') ?? []
    const tokenListSwitchSettings = getLocalItem<{ [mapName: string]: boolean }>('TOKEN_LIST_SWITCH_SETTINGS') ?? {}

    useToken.setState((s) => ({
      tokenListSettings: {
        ...s.tokenListSettings,
        [SOLANA_TOKEN_LIST_NAME]: {
          ...s.tokenListSettings[SOLANA_TOKEN_LIST_NAME],
          isOn: tokenListSwitchSettings[SOLANA_TOKEN_LIST_NAME] ?? s.tokenListSettings[SOLANA_TOKEN_LIST_NAME].isOn
        },
        [USER_ADDED_TOKEN_LIST_NAME]: {
          ...s.tokenListSettings[USER_ADDED_TOKEN_LIST_NAME],
          mints: new Set(userAddedTokens.map((token) => toPubString(token.mint))),
          isOn:
            tokenListSwitchSettings[USER_ADDED_TOKEN_LIST_NAME] ?? s.tokenListSettings[USER_ADDED_TOKEN_LIST_NAME].isOn
        }
      }
    }))

    if (connection) {
      const decimalsedUserAddedTokensInLocalStorage = shakeUndifindedItem(
        await getTokenFromLocalStorage(userAddedTokens)
      )
      useToken.setState((s) => {
        const added = {
          ...s.userAddedTokens,
          ...listToMap(decimalsedUserAddedTokensInLocalStorage, (i) => toPubString(i.mint))
        }
        return {
          userAddedTokens: added
        }
      })
    }
  }, [connection])

  const tokenListSettings = useToken((s) => s.tokenListSettings)
  // whenever tokenListSettings changed, save it to localStorage
  const userAddedTokens = useToken((s) => s.userAddedTokens)
  const tokens = useToken((s) => s.tokens)
  useEffect(() => {
    if (!connection) return
    const tokenMints = Object.keys(tokens)
    setLocalItem(
      'TOKEN_LIST_USER_ADDED_TOKENS',
      Object.values(userAddedTokens)
        .filter((t) => !tokenMints.includes(toPubString(t.mint))) // delete already in token list's old user added token
        .map((t) => omit(t, 'decimals'))
    ) // add token / remove token
  }, [connection, userAddedTokens, tokens])

  useEffect(() => {
    setLocalItem(
      'TOKEN_LIST_SWITCH_SETTINGS',
      objectMap(tokenListSettings, (i) => i.isOn)
    )
  }, [tokenListSettings])
}
