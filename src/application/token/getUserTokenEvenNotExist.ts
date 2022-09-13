import useToken from '@/application/token/useToken'
import toPubString from '@/functions/format/toMintString'
import { PublicKeyish } from '@raydium-io/raydium-sdk'
import { getOnlineTokenDecimals } from './getOnlineTokenInfo'
import { SplToken } from './type'
import { createSplToken } from './useTokenListsLoader'

/**
 *
 * @param mint
 * @param symbol symbol can be empty string, (means use the start of mint to be it's temp symbol)
 * @returns
 */
export async function getUserTokenEvenNotExist(mintish: PublicKeyish, symbol?: string): Promise<SplToken | undefined> {
  const tokens = useToken.getState().tokens
  const userAddedTokens = useToken.getState().userAddedTokens
  const tokensHasLoaded = Object.keys(tokens).length > 0
  if (!tokensHasLoaded) return undefined // not load token list
  const mint = toPubString(mintish)
  const token = useToken.getState().getToken(mint)
  if (!token) {
    const tokenDecimals = await getOnlineTokenDecimals(mint)
    if (tokenDecimals == null) return undefined

    const hasUserAddedTokensLoadedWhenGetOnlineTokenDecimals = userAddedTokens !== useToken.getState().userAddedTokens // userAddedTokens may loaded during await
    if (hasUserAddedTokensLoadedWhenGetOnlineTokenDecimals) return undefined
    const newCreatedToken = createSplToken({
      mint,
      decimals: tokenDecimals,
      symbol: symbol || mint.slice(0, 6),
      userAdded: true
    })

    useToken.getState().addUserAddedToken(newCreatedToken)
    return newCreatedToken
  } else {
    return token
  }
}
