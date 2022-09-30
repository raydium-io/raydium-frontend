import { AmmV3, ZERO } from 'test-r-sdk'

import assert from '@/functions/assert'
import { toString } from '@/functions/numberish/toString'

import useAppSettings from '../appSettings/useAppSettings'
import { loadTransaction } from '../txTools/createTransaction'
import handleMultiTx from '../txTools/handleMultiTx'
import useWallet from '../wallet/useWallet'

import { HydratedConcentratedInfo, UserPositionAccount } from './type'
import useConcentrated from './useConcentrated'

export default function txHavestConcentrated({
  currentAmmPool = useConcentrated.getState().currentAmmPool,
  targetUserPositionAccount = useConcentrated.getState().targetUserPositionAccount
}: {
  currentAmmPool?: HydratedConcentratedInfo
  targetUserPositionAccount?: UserPositionAccount
} = {}) {
  return handleMultiTx(async ({ transactionCollector, baseUtils: { connection, owner, allTokenAccounts } }) => {
    const { tokenAccountRawInfos } = useWallet.getState()
    const { slippageTolerance } = useAppSettings.getState()
    assert(currentAmmPool, 'not seleted amm pool')
    assert(targetUserPositionAccount, 'not set targetUserPositionAccount')
    const { transaction, signers, address } = await AmmV3.makeDecreaseLiquidityTransaction({
      connection: connection,
      liquidity: ZERO,
      poolInfo: currentAmmPool.state,
      ownerInfo: {
        feePayer: owner,
        wallet: owner,
        tokenAccounts: tokenAccountRawInfos,
        useSOLBalance: true,
        closePosition: false
      },
      slippage: Number(toString(slippageTolerance)),
      ownerPosition: targetUserPositionAccount.sdkParsed
    })
    transactionCollector.add(await loadTransaction({ transaction: transaction, signers: signers }), {
      txHistoryInfo: {
        title: 'Havest Concentrated',
        description: `Havest concentrated pool: ${currentAmmPool.base?.symbol ?? '--'} - ${
          currentAmmPool.quote?.symbol ?? '--'
        }`
      }
    })
  })
}
