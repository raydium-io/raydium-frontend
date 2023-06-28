import toPubString from '@/functions/format/toMintString'
import { isArray, isObject, isPubKeyish } from '@/functions/judgers/dateType'
import { MayArray } from '@/types/generics'
import { PublicKeyish } from '@raydium-io/raydium-sdk'
import { TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { HydratedTokenJsonInfo, SplToken } from './type'
import useToken from './useToken'

export function isToken2022(token: MayArray<SplToken | HydratedTokenJsonInfo | PublicKeyish | undefined>): boolean {
  return isArray(token) ? token.every(isToken2022) : token ? tokenIsToken2022(token) : false
}

/**
 * !!! check inner token state
 */
function tokenIsToken2022(token: SplToken | PublicKeyish | HydratedTokenJsonInfo) {
  if (isObject(token) && 'extensions' in token) {
    return token.extensions?.version === 'TOKEN2022'
  }
  const mint = toPubString(isPubKeyish(token) ? token : token.mint)
  const { tokens, userAddedTokens } = useToken.getState()
  const allTokens = { ...tokens, ...userAddedTokens }
  return allTokens[mint]?.extensions?.version === 'TOKEN2022'
}

/** get token programId to token or token2022 */
export function getTokenProgramId(token: SplToken | PublicKeyish | HydratedTokenJsonInfo) {
  return isToken2022(token) ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID
}
