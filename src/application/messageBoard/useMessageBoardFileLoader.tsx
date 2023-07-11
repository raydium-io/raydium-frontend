export default function useMessageBoardFileLoader() {
  // 🚑 currently don't use
  // // whenever app start , get messageBoardItems from `raydium-message-board.json`
  // useAsyncEffect(async () => {
  //   const messageItems = (await jFetch('/raydium-message-board.json')) as MessageBoardItem[]
  //   if (!messageItems) return
  //   useMessageBoard.setState({ messageBoardItems: messageItems })
  //   // const fetchLinkedMessageItems = await Promise.all(
  //   //   messageItems.map(async (items) => (items.isDetailALink ? await tFetch(items.details) : items.details))
  //   // )
  //   const fetchLinkedMessageItems = await asyncMap(
  //     messageItems,
  //     async (items) =>
  //       ({
  //         ...items,
  //         details: items.isDetailALink ? await tryFetch(items.details) : items.details
  //       } as MessageBoardItem)
  //   )
  //   useMessageBoard.setState({ messageBoardItems: fetchLinkedMessageItems })
  // }, [])
}
