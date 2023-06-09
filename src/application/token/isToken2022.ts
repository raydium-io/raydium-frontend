import { SplToken } from './type'

export function isToken2022(coin1: SplToken): boolean {
  return coin1.extensions?.version === 'TOKEN2022'
}
