import handleMultiTx, { TxAddOptions, TxShadowOptions } from '@/application/txTools/handleMultiTx'
import { createTransactionCollector } from '@/application/txTools/createTransaction'

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
