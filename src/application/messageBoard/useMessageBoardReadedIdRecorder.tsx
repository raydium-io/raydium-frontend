import { useEffect } from 'react'

import { getLocalItem, setLocalItem } from '@/functions/dom/jStorage'
import useUpdate from '@/hooks/useUpdate'

import useMessageBoard from './useMessageBoard'

/**
 * sync user's readedIds
 */
export default function useMessageBoardReadedIdRecorder() {
  const readedIds = useMessageBoard((s) => s.readedIds)

  // whenever app start , get readedId from localStorage
  useEffect(() => {
    const readedIds = getLocalItem('READED_MESSAGE_ITEM_IDS') as string[] | undefined
    if (!readedIds) return
    useMessageBoard.setState({ readedIds: new Set(readedIds) })
  }, [])

  // whenever readedIds changed, save it to localStorage
  useUpdate(() => {
    if (readedIds.size === 0) return
    setLocalItem('READED_MESSAGE_ITEM_IDS', [...readedIds])
  }, [readedIds])
}
