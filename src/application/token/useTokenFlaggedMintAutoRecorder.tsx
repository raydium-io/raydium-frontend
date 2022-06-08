import { useEffect } from 'react'

import { getLocalItem, setLocalItem } from '@/functions/dom/jStorage'

import { useToken } from './useToken'

export default function useTokenMintAutoRecord() {
  const userFlaggedTokenMints = useToken((s) => s.userFlaggedTokenMints)

  // whenever userFlaggedTokenMints changed, save it to localStorage
  useEffect(() => {
    setLocalItem('USER_FLAGGED_TOKEN_MINTS', Array.from(userFlaggedTokenMints))
  }, [userFlaggedTokenMints])

  // whenever app start , get userFlaggedTokenMints from localStorage
  useEffect(() => {
    const recordedUserFlaggedTokenMints = getLocalItem('USER_FLAGGED_TOKEN_MINTS')
    if (!recordedUserFlaggedTokenMints) return
    useToken.setState({ userFlaggedTokenMints: new Set(recordedUserFlaggedTokenMints) })
  }, [])
}
