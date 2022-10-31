import { Connection } from '@solana/web3.js'

import { PublicKeyish } from '@raydium-io/raydium-sdk'

import { toPub } from '@/functions/format/toMintString'

import { SplToken } from '../token/type'
import { getWalletTokenAccounts } from '../wallet/getWalletTokenAccounts'
import { parseBalanceFromTokenAccount } from '../wallet/useBalanceRefresher'

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
