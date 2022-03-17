import { TimeStamp, TimeStampLiteral } from '@/functions/date/interface'
import { SrcAddress } from '@/types/constants'

export type MessageBoardItem = {
  title: string
  id: string
  summary: string
  /** also use it as id */
  updatedAt: TimeStampLiteral
  type: 'text' | 'markdown'
  isDetailALink?: boolean
  details: string | SrcAddress
}
