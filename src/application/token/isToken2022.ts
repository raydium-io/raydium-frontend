import { isArray } from '@/functions/judgers/dateType'
import { SplToken } from './type'
import { MayArray } from '@/types/generics'

export function isToken2022(token: MayArray<SplToken | undefined>): boolean {
  return isArray(token) ? token.every(isToken2022) : token?.extensions?.version === 'TOKEN2022'
}
