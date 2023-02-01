import assert from '@/functions/assert'
import txHandler from '../txTools/handleTx'
import { generateCreateClmmPositionTx } from './txCreateConcentratedPosition'
import useConcentrated from './useConcentrated'

export default function txCreateNewConcentratedPool() {
  return txHandler(async ({ transactionCollector }) => {
    const { tempDataCache } = useConcentrated.getState()
    assert(tempDataCache, 'should create pool first')
    const createPoolInnerTransaction = tempDataCache
    const openPositionInnerTransaction = await generateCreateClmmPositionTx()

    transactionCollector.add(createPoolInnerTransaction, {
      txHistoryInfo: { title: 'Create pool', description: `create clmm pool` }
    })
    transactionCollector.add(openPositionInnerTransaction, {
      txHistoryInfo: { title: 'Open pool position', description: `Open clmm pool position` }
    })
  })
}
