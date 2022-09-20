import { toPub } from '@/functions/format/toMintString'
import { PublicKeyish } from 'test-r-sdk'
import { Connection } from '@solana/web3.js'
import { SplToken } from '../token/type'
import { parseBalanceFromTokenAccount } from '../wallet/useBalanceRefresher'
import { getWalletTokenAccounts } from '../wallet/getWalletTokenAccounts'

export async function getWalletBalance({
  walletPublickeyish,
  connection,
  getPureToken
}: {
  walletPublickeyish: PublicKeyish
  connection: Connection
  getPureToken: (mint: PublicKeyish | undefined) => SplToken | undefined
}) {
  const { accounts, rawInfos } = await getWalletTokenAccounts({
    connection,
    owner: toPub(walletPublickeyish)
  })
  return parseBalanceFromTokenAccount({
    allTokenAccounts: accounts,
    getPureToken
  })
}
