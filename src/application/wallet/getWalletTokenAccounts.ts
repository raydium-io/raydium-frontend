import {
  GetTokenAccountsByOwnerConfig,
  Logger,
  Spl,
  SPL_ACCOUNT_LAYOUT,
  TOKEN_PROGRAM_ID
} from '@raydium-io/raydium-sdk'
import { Connection, PublicKey } from '@solana/web3.js'

import toBN from '@/functions/numberish/toBN'

import { ITokenAccount, TokenAccountRawInfo } from './type'
import { TOKEN_2022_PROGRAM_ID } from '@solana/spl-token'

const logger = new Logger('nft-ui')

export async function getWalletTokenAccounts({
  connection,
  owner,
  config
}: {
  connection: Connection
  owner: PublicKey
  config?: GetTokenAccountsByOwnerConfig
}): Promise<{ accounts: ITokenAccount[]; rawInfos: TokenAccountRawInfo[] }> {
  const defaultConfig = {}
  const customConfig = { ...defaultConfig, ...config }

  const solReq = connection.getAccountInfo(owner, customConfig.commitment)
  const tokenReq = connection.getTokenAccountsByOwner(owner, { programId: TOKEN_PROGRAM_ID }, customConfig.commitment)
  const token2022Req = connection.getTokenAccountsByOwner(
    owner,
    { programId: TOKEN_2022_PROGRAM_ID },
    customConfig.commitment
  )

  const [solRes, tokenRes, token2022Res] = await Promise.all([solReq, tokenReq, token2022Req])

  const accounts: ITokenAccount[] = []
  const rawInfos: TokenAccountRawInfo[] = []

  for (const { pubkey, account } of [...tokenRes.value, ...token2022Res.value]) {
    const rawResult = SPL_ACCOUNT_LAYOUT.decode(account.data)
    const { mint, amount } = rawResult
    const associatedTokenAddress = Spl.getAssociatedTokenAccount({ mint, owner, programId: account.owner })
    accounts.push({
      publicKey: pubkey,
      mint,
      isAssociated: associatedTokenAddress.equals(pubkey),
      amount,
      isNative: false
    })
    rawInfos.push({ pubkey, accountInfo: rawResult, programId: account.owner } as TokenAccountRawInfo)
  }

  accounts.push({
    amount: toBN(solRes ? String(solRes.lamports) : 0),
    isNative: true
  })

  return { accounts, rawInfos }
}
