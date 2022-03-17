import asyncMap from '@/functions/asyncMap'
import jFetch, { tryFetch } from '@/functions/dom/jFetch'
import useAsyncEffect from '@/hooks/useAsyncEffect'

import { MessageBoardItem } from './type'
import useMessageBoard from './useMessageBoard'

export default function useMessageBoardFileLoader() {
  // whenever app start , get messageBoardItems from `raydium-message-board.json`
  useAsyncEffect(async () => {
    const messageItems = (await jFetch('/raydium-message-board.json')) as MessageBoardItem[]
    if (!messageItems) return
    useMessageBoard.setState({ messageBoardItems: messageItems })

    // const fetchLinkedMessageItems = await Promise.all(
    //   messageItems.map(async (items) => (items.isDetailALink ? await tFetch(items.details) : items.details))
    // )
    const fetchLinkedMessageItems = await asyncMap(
      messageItems,
      async (items) =>
        ({
          ...items,
          details: items.isDetailALink ? await tryFetch(items.details) : items.details
        } as MessageBoardItem)
    )
    useMessageBoard.setState({ messageBoardItems: fetchLinkedMessageItems })
  }, [])
}
