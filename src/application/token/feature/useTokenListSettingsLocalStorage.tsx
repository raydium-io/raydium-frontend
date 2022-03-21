import { useEffect } from 'react'

import { getLocalItem, setLocalItem } from '@/functions/dom/jStorage'

import {
  RAYDIUM_DEV_TOKEN_LIST_NAME,
  RAYDIUM_MAINNET_TOKEN_LIST_NAME,
  RAYDIUM_MAINNET_TOKEN_LIST_NAME_DEPRECATED,
  SOLANA_TOKEN_LIST_NAME,
  USER_ADDED_TOKEN_LIST_NAME,
  useToken
} from '../useToken'

export default function useTokenListSettingsLocalStorage() {
  const tokenListSettings = useToken((s) => s.tokenListSettings)

  // whenever app start , get tokenListSettings from localStorage
  useEffect(() => {
    const recordedTokenListSettings = getLocalItem('TOKEN_LIST_SETTINGS', (key, value) =>
      key === 'mints' ? new Set(value) : value
    )

    if (!recordedTokenListSettings) return
    useToken.setState({
      tokenListSettings: {
        [RAYDIUM_MAINNET_TOKEN_LIST_NAME]:
          recordedTokenListSettings[RAYDIUM_MAINNET_TOKEN_LIST_NAME] ??
          recordedTokenListSettings[RAYDIUM_MAINNET_TOKEN_LIST_NAME_DEPRECATED],
        [RAYDIUM_DEV_TOKEN_LIST_NAME]: recordedTokenListSettings[RAYDIUM_DEV_TOKEN_LIST_NAME],
        [SOLANA_TOKEN_LIST_NAME]: recordedTokenListSettings[SOLANA_TOKEN_LIST_NAME],
        [USER_ADDED_TOKEN_LIST_NAME]: recordedTokenListSettings[USER_ADDED_TOKEN_LIST_NAME]
      }
    })
  }, [])

  // whenever tokenListSettings changed, save it to localStorage
  useEffect(() => {
    // console.log('33: ', tokenListSettings['Solana Token List'].isOn)
    setLocalItem('TOKEN_LIST_SETTINGS', tokenListSettings, (key, value) =>
      key === 'mints' ? [...(value as Set<any>)] : value
    )
  }, [tokenListSettings])
}
