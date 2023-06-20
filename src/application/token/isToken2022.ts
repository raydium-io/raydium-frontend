import toPubString from '@/functions/format/toMintString'
import { isArray, isPubKeyish } from '@/functions/judgers/dateType'
import { MayArray } from '@/types/generics'
import { PublicKeyish } from '@raydium-io/raydium-sdk'
import { isOnlineToken2022 } from './getOnlineTokenInfo'
import { HydratedTokenJsonInfo, SplToken } from './type'
import useToken from './useToken'
import { TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from '@solana/spl-token'

export async function isToken2022(
  token: MayArray<SplToken | HydratedTokenJsonInfo | PublicKeyish | undefined>
): Promise<boolean> {
  return isArray(token) ? token.every(isToken2022) : token ? tokenIsToken2022(token) : false
}

export function isToken2022Sync(token: MayArray<SplToken | HydratedTokenJsonInfo | PublicKeyish | undefined>): boolean {
  return isArray(token) ? token.every(isToken2022Sync) : token ? tokenIsToken2022Sync(token) : false
}

/**
 * !!! check inner token state
 */
async function tokenIsToken2022(token: SplToken | PublicKeyish | HydratedTokenJsonInfo) {
  const mint = toPubString(isPubKeyish(token) ? token : token.mint)
  const { tokens } = useToken.getState()
  const hasToken = tokens[mint]
  return hasToken ? tokens[mint]?.extensions?.version === 'TOKEN2022' : isOnlineToken2022(mint)
}

function tokenIsToken2022Sync(token: SplToken | PublicKeyish | HydratedTokenJsonInfo) {
  const mint = toPubString(isPubKeyish(token) ? token : token.mint)
  const { tokens } = useToken.getState()
  return tokens[mint]?.extensions?.version === 'TOKEN2022'
}

/** get token programId to token or token2022 */
export async function getTokenProgramId(token: SplToken | PublicKeyish | HydratedTokenJsonInfo) {
  return (await isToken2022(token)) ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID
}

export function getTokenProgramIdSync(token: SplToken | PublicKeyish | HydratedTokenJsonInfo) {
  return isToken2022Sync(token) ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID
}
