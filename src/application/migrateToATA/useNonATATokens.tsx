import { SplToken, TokenAmount } from '@/application/token/type'
import useToken from '@/application/token/useToken'
import { ITokenAccount } from '@/application/wallet/type'
import useWallet from '@/application/wallet/useWallet'
import toPubString from '@/functions/format/toMintString'
import { toTokenAmount } from '@/functions/format/toTokenAmount'
import { useMemo } from 'react'

/** collect toke into  */
function collectTokenAccountsToJSMapByMintKey(allTokenAccounts: ITokenAccount[]) {
  const result = new Map<string /* mint string */, ITokenAccount[]>()
  const tokenMintKey = (account: ITokenAccount) => toPubString(account.mint) ?? 'native'
  for (const account of allTokenAccounts) {
    if (!result.has(tokenMintKey(account))) {
      result.set(tokenMintKey(account), [])
    }
    const jsSet = result.get(tokenMintKey(account))!
    jsSet.push(account)
  }
  return result
}
/** provide data of non-ata(associated token address) */
export function useNonATATokens() {
  const allTokenAccounts = useWallet((s) => s.allTokenAccounts)
  const getToken = useToken((s) => s.getToken)
  type NonATAInfo = {
    token: SplToken
    tokenAmount: TokenAmount
    tokenAccount: ITokenAccount
    ataToken?: SplToken
    ataTokenAccount?: ITokenAccount
  }

  const nonATA: Map<string /* token account address */, NonATAInfo> = useMemo(() => {
    const resultMap = new Map<string, NonATAInfo>()
    const allTokenAccountMapByMints = collectTokenAccountsToJSMapByMintKey(allTokenAccounts)
    for (const tokenAccount of allTokenAccounts) {
      if (!tokenAccount.isAssociated && !tokenAccount.isNative) {
        const token = getToken(tokenAccount.mint, { exact: true })
        if (!token) continue
        const ataTokenAccount = allTokenAccountMapByMints
          .get(toPubString(tokenAccount.mint))
          ?.find((a) => a.isAssociated)
        const ataToken = getToken(ataTokenAccount?.mint, { exact: true })
        resultMap.set(toPubString(tokenAccount.publicKey), {
          token,
          tokenAmount: toTokenAmount(token, tokenAccount.amount),
          tokenAccount,
          ataToken,
          ataTokenAccount
        })
      }
    }
    return resultMap
  }, [allTokenAccounts])
  return nonATA
}
