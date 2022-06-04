import { useEffect } from 'react'

import { getLocalItem, setLocalItem } from '@/functions/dom/jStorage'

import { SOLANA_TOKEN_LIST_NAME, USER_ADDED_TOKEN_LIST_NAME, useToken } from '../useToken'
import { objectMap } from '@/functions/objectMethods'
import { SplTokenJsonInfo } from '@raydium-io/raydium-sdk'
import toPubString from '@/functions/format/toMintString'
import { createSplToken } from './useTokenListsLoader'

export default function useTokenListSettingsLocalStorage() {
  // whenever app start , get tokenListSettings from localStorage
  useEffect(() => {
    const userAddedTokens = getLocalItem<SplTokenJsonInfo[]>('TOKEN_LIST_USER_ADDED_TOKENS') ?? []
    const tokenListSwitchSettings = getLocalItem<{ [mapName: string]: boolean }>('TOKEN_LIST_SWITCH_SETTINGS') ?? {}

    useToken.setState((s) => ({
      userAddedTokens: new Map(userAddedTokens.map((t) => [toPubString(t.mint), createSplToken({ ...t })])),
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
  }, [])

  const tokenListSettings = useToken((s) => s.tokenListSettings)
  // whenever tokenListSettings changed, save it to localStorage
  const userAddedTokens = useToken((s) => s.userAddedTokens)

  useEffect(() => {
    setLocalItem('TOKEN_LIST_USER_ADDED_TOKENS', Array.from(userAddedTokens.values())) // add token / remove token
    setLocalItem(
      'TOKEN_LIST_SWITCH_SETTINGS',
      objectMap(tokenListSettings, (i) => i.isOn)
    )
  }, [tokenListSettings])
}
