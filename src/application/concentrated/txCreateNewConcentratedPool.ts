import assert from '@/functions/assert'
import txHandler from '../txTools/handleTx'
import { generateCreateClmmPositionTx } from './txCreateConcentratedPosition'
import useConcentrated from './useConcentrated'

export default function txCreateNewConcentratedPool() {
  return txHandler(async ({ transactionCollector }) => {
    const { tempDataCache } = useConcentrated.getState()
    assert(tempDataCache, 'should create pool first')
    const { signedTransaction: createPoolTx } = tempDataCache
    const { signedTransaction: openPositionTx } = await generateCreateClmmPositionTx()

    transactionCollector.addQueue([
      [createPoolTx, { txHistoryInfo: { title: 'Create pool', description: `create new clmm pool` } }],
      [openPositionTx, { txHistoryInfo: { title: 'Init position', description: `init position` } }]
    ])
  })
}
