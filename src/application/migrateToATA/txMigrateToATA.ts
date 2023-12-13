import { Farm } from '@raydium-io/raydium-sdk'
import useAppAdvancedSettings from '../common/useAppAdvancedSettings'
import txHandler, { lookupTableCache } from '../txTools/handleTx'
import useWallet from '../wallet/useWallet'

export default function txMigrateToATA(selectedTokenAccountKeys: string[]) {
  return txHandler(async ({ transactionCollector, baseUtils: { connection, owner } }) => {
    const { programIds } = useAppAdvancedSettings.getState()
    const { tokenAccountRawInfos, txVersion } = useWallet.getState()
    const { innerTransactions, address } = await Farm.makeV1InfoToV2PdaAndHarvestSimple({
      connection,
      wallet: owner,
      programIdV3: programIds.FarmV3,
      programIdV5: programIds.FarmV5,
      tokenAccounts: tokenAccountRawInfos,
      lookupTableCache,
      makeTxVersion: txVersion
    })
    if (!innerTransactions.length) {
      throw new Error('No account needs to be migrate')
    }
    transactionCollector.add(innerTransactions, {
      txHistoryInfo: {
        title: 'PDA Migrate',
        description: `Migrate PDA from V1 to V2 and harvest`
      }
    })
  })
}
