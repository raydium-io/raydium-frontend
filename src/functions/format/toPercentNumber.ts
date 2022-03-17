import { isNumber } from '@/functions/judgers/dateType'
import { notExist } from '@/functions/judgers/nil'
import { StringNumber } from '@/types/constants'

export default function toPercentNumber(n?: StringNumber): number {
  if (notExist(n)) return 0
  if (isNumber(n)) return n
  const num = Number(n.endsWith('%') ? n.slice(0, n.length - 1) : n)
  return num / 100
}
