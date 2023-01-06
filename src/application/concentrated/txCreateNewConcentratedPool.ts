import assert from '@/functions/assert'
import txHandler from '../txTools/handleTx'
import { generateCreateClmmPositionTx } from './txCreateConcentratedPosition'
import useConcentrated from './useConcentrated'

export default function txCreateNewConcentratedPool() {
  return txHandler(async ({ transactionCollector }) => {
    const { tempDataCache } = useConcentrated.getState()
    assert(tempDataCache, 'should create pool first')
    const { transaction: createPoolTx, signers: createPoolSigners } = tempDataCache
    const { transaction: openPositionTx, signers: openPositionSigners } = await generateCreateClmmPositionTx()

    const createPoolTxSigners = {
      transaction: createPoolTx,
      signers: createPoolSigners
    }

    const openPositionTxSigners = {
      transaction: openPositionTx,
      signers: openPositionSigners
    }

    transactionCollector.addQueue([
      [createPoolTxSigners, { txHistoryInfo: { title: 'Create pool', description: `create clmm pool` } }],
      [
        openPositionTxSigners,
        { txHistoryInfo: { title: 'Open pool position', description: `Open clmm pool position` } }
      ]
    ])
  })
}
