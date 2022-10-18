import { AmmV3 } from 'test-r-sdk'

import assert from '@/functions/assert'
import toFraction from '@/functions/numberish/toFraction'
import useConnection from '../connection/useConnection'
import { isQuantumSOLVersionSOL } from '../token/quantumSOL'
import { ammV3ProgramId } from '../token/wellknownProgram.config'
import { SOLMint } from '../token/wellknownToken.config'
import { loadTransaction } from '../txTools/createTransaction'
import txHandler from '../txTools/handleTx'
import { jsonInfo2PoolKeys } from '../txTools/jsonInfo2PoolKeys'
import useWallet from '../wallet/useWallet'
import hydrateConcentratedInfo from './hydrateConcentratedInfo'
import useConcentrated from './useConcentrated'
import { generateCreateClmmPositionTx } from './txCreateConcentratedPosition'

export default function txCreateNewConcentratedPool() {
  return txHandler(async ({ transactionCollector }) => {
    const { tempDataCache } = useConcentrated.getState()
    assert(tempDataCache, 'should create pool first')
    const { transaction: createPoolTx, signers: createPoolSigners } = tempDataCache
    const { transaction: openPositionTx, signers: openPositionSigners } = await generateCreateClmmPositionTx()

    const createPoolTxSigners = await loadTransaction({
      transaction: createPoolTx,
      signers: createPoolSigners
    })

    const openPositionTxSigners = await loadTransaction({
      transaction: openPositionTx,
      signers: openPositionSigners
    })

    transactionCollector.addQueue([
      [createPoolTxSigners, { txHistoryInfo: { title: 'Create pool', description: `create clmm pool` } }],
      [
        openPositionTxSigners,
        { txHistoryInfo: { title: 'Open pool position', description: `Open clmm pool position` } }
      ]
    ])
  })
}
