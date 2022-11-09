import {
  GetTokenAccountsByOwnerConfig, Logger, Spl, SPL_ACCOUNT_LAYOUT, TOKEN_PROGRAM_ID
} from '@raydium-io/raydium-sdk'
import { Connection, PublicKey } from '@solana/web3.js'

import BN from 'bn.js'

import toBN from '@/functions/numberish/toBN'

import { ITokenAccount, TokenAccountRawInfo } from './type'

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

  const [solResp, tokenResp] = await Promise.all([solReq, tokenReq])

  const accounts: ITokenAccount[] = []
  const rawInfos: TokenAccountRawInfo[] = []

  for (const { pubkey, account } of tokenResp.value) {
    // double check layout length
    if (account.data.length !== SPL_ACCOUNT_LAYOUT.span) {
      return logger.throwArgumentError('invalid token account layout length', 'publicKey', pubkey.toBase58())
    }

    const rawResult = SPL_ACCOUNT_LAYOUT.decode(account.data)
    const { mint, amount } = rawResult

    const associatedTokenAddress = await Spl.getAssociatedTokenAccount({ mint, owner })
    accounts.push({
      publicKey: pubkey,
      mint,
      isAssociated: associatedTokenAddress.equals(pubkey),
      amount,
      isNative: false
    })
    rawInfos.push({ pubkey, accountInfo: rawResult })
  }

  if (solResp) {
    accounts.push({
      amount: toBN(String(solResp.lamports)),
      isNative: true
    })
  }

  return { accounts, rawInfos }
}
