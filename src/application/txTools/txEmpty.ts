import { Spl, TokenAmount } from '@raydium-io/raydium-sdk'
import { PublicKey } from '@solana/web3.js'

import handleMultiTx, { TxAddOptions, TxShadowOptions } from '@/application/txTools/handleMultiTx'
import { createTransactionCollector } from '@/application/txTools/createTransaction'
import { PublicKeyish } from '@/types/constants'
import toPubString, { toPub } from '@/functions/format/toMintString'
import { toString } from '@/functions/numberish/toString'
import { getRichWalletTokenAccounts } from '../wallet/feature/useTokenAccountsRefresher'

export default async function txEmpty(options: TxAddOptions & TxShadowOptions) {
  return handleMultiTx(
    async ({ transactionCollector, baseUtils: { owner, connection, tokenAccounts } }) => {
      const piecesCollection = createTransactionCollector()
      transactionCollector.add(await piecesCollection.spawnTransaction(), {
        ...options,
        txHistoryInfo: {
          title: 'Debug'
        }
      })
    },
    { forceKeyPairs: options.forceKeyPairs }
  )
}
