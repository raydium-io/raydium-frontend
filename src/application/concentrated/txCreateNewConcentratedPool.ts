import assert from '@/functions/assert'
import { Transaction } from '@solana/web3.js'
import { loadTransaction } from '../txTools/createTransaction'
import txHandler from '../txTools/handleTx'
import { generateCreateClmmPositionTx } from './txCreateConcentratedPosition'
import useConcentrated from './useConcentrated'

export default function txCreateNewConcentratedPool() {
  return txHandler(async ({ transactionCollector }) => {
    const { tempDataCache } = useConcentrated.getState()
    assert(tempDataCache, 'should create pool first')
    const { transaction: createPoolTx, signers: createPoolSigners } = tempDataCache
    const { transaction: openPositionTx, signers: openPositionSigners } = await generateCreateClmmPositionTx()

    const newTx = new Transaction()
    newTx.add(...createPoolTx.instructions.slice(1, 3), ...openPositionTx.instructions)

    const createAndOpenPositionTx = await loadTransaction({
      // BUG hear <--
      transaction: newTx,
      signers: [...createPoolSigners, ...openPositionSigners]
    })
    transactionCollector.addQueue([
      [
        createAndOpenPositionTx,
        { txHistoryInfo: { title: 'Create pool And Open Position', description: `create clmm pool and open position` } }
      ]
    ])
  })
}
