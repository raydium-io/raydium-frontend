import { useEffect } from 'react'

import { getLocalItem, setLocalItem } from '@/functions/dom/jStorage'

import { useToken } from '../useToken'

export default function useTokenListSettingsLocalStorage() {
  const tokenListSettings = useToken((s) => s.tokenListSettings)

  // whenever app start , get tokenListSettings from localStorage
  useEffect(() => {
    const recordedTokenListSettings = getLocalItem('TOKEN_LIST_SETTINGS', (key, value) =>
      key === 'mints' ? new Set(value) : value
    )
    if (!recordedTokenListSettings) return
    useToken.setState({ tokenListSettings: recordedTokenListSettings })
  }, [])

  // whenever tokenListSettings changed, save it to localStorage
  useEffect(() => {
    // console.log('33: ', tokenListSettings['Solana Token List'].isOn)
    setLocalItem('TOKEN_LIST_SETTINGS', tokenListSettings, (key, value) =>
      key === 'mints' ? [...(value as Set<any>)] : value
    )
  }, [tokenListSettings])
}
