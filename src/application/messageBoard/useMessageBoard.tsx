import { create } from 'zustand'

import { MessageBoardItem } from './type'

export type MessageBoardStore = {
  messageBoardItems: MessageBoardItem[]
  currentMessageBoardItem: MessageBoardItem | null
  readedIds: Set<MessageBoardItem['id']>
}
const useMessageBoard = create<MessageBoardStore>((set, get) => ({
  messageBoardItems: [],
  currentMessageBoardItem: null,
  readedIds: new Set()
}))

export default useMessageBoard
