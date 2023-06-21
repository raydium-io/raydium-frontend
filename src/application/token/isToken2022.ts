import toPubString from '@/functions/format/toMintString'
import { isArray, isPubKeyish } from '@/functions/judgers/dateType'
import { MayArray } from '@/types/generics'
import { PublicKeyish } from '@raydium-io/raydium-sdk'
import { TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { HydratedTokenJsonInfo, SplToken } from './type'
import useToken from './useToken'

export function isToken2022(token: MayArray<SplToken | HydratedTokenJsonInfo | PublicKeyish | undefined>): boolean {
  return isArray(token) ? token.every(isToken2022) : token ? tokenIsToken2022(token) : false
}

export function isToken2022Async(
  token: MayArray<SplToken | HydratedTokenJsonInfo | PublicKeyish | undefined>
): boolean {
  return isArray(token) ? token.every(isToken2022Async) : token ? tokenIsToken2022Async(token) : false
}

/**
 * !!! check inner token state
 */
function tokenIsToken2022(token: SplToken | PublicKeyish | HydratedTokenJsonInfo) {
  const mint = toPubString(isPubKeyish(token) ? token : token.mint)
  const { tokens } = useToken.getState()
  return tokens[mint]?.extensions?.version === 'TOKEN2022'
}

function tokenIsToken2022Async(token: SplToken | PublicKeyish | HydratedTokenJsonInfo) {
  const mint = toPubString(isPubKeyish(token) ? token : token.mint)
  const { tokens } = useToken.getState()
  return tokens[mint]?.extensions?.version === 'TOKEN2022'
}

/** get token programId to token or token2022 */
export function getTokenProgramId(token: SplToken | PublicKeyish | HydratedTokenJsonInfo) {
  return isToken2022(token) ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID
}
