import jFetch from '@/functions/dom/jFetch'
import toPubString, { toPub } from '@/functions/format/toMintString'
import toBN from '@/functions/numberish/toBN'
import { Farm, PublicKeyish } from '@raydium-io/raydium-sdk'
import { Connection } from '@solana/web3.js'
import BN from 'bn.js'

type WalletMigrateHistory = {
  success: boolean
  wallet: null | string /* maybe wallet address */
}
type WalletMigrateResponse = {
  success: boolean
  msg: string
}

export async function getWalletMigrateHistory(walletAddress: PublicKeyish): Promise<string | undefined> {
  const history = await jFetch<WalletMigrateHistory>(
    `https://api.raydium.io/v2/change-wallet?oldWallet=${toPubString(walletAddress)}`
  )
  const currentBindWalletAddress = history?.success && history.wallet ? history.wallet : undefined
  // const haveBindAlready = !!currentBindWalletAddress
  return currentBindWalletAddress
}

export async function setWalletMigrateTarget(
  walletAddress: PublicKeyish,
  migrateTarget: PublicKeyish,
  { signature }: { signature: string }
): Promise<WalletMigrateResponse | undefined> {
  return jFetch<WalletMigrateResponse>(`https://api.raydium.io/v2/change-wallet`, {
    headers: { 'content-type': 'application/json' },
    method: 'POST',
    body: JSON.stringify({ signature, oldWallet: toPubString(walletAddress), newWallet: toPubString(migrateTarget) })
  })
}

/**
 * if wallet haven't stake RAY, it can't be stakeable
 * @author Rudy
 */
export async function checkStakingRay(wallet: PublicKeyish, payloads: { connection: Connection }): Promise<BN> {
  const pda = await Farm.getAssociatedLedgerAccount({
    programId: toPub('EhhTKczWMGQt46ynNeRX1WfeagwwJd7ufHvCDjRxjo5Q'),
    poolId: toPub('4EwbZo8BZXP5313z5A2H11MRBP15M5n6YxfmkjXESKAW'),
    owner: toPub(wallet)
  })
  const accountInfo = await payloads.connection.getAccountInfo(pda)

  if (
    accountInfo &&
    accountInfo.data
      .toJSON()
      .data.slice(72, 80)
      .find((i) => i > 0)
  ) {
    return toBN(Buffer.from(accountInfo.data.toJSON().data.slice(72, 80)).readBigInt64LE().toString())
  }
  return toBN(0)
}
