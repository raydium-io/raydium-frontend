import { AmmV3 } from 'test-r-sdk'

import assert from '@/functions/assert'
import toPubString from '@/functions/format/toMintString'
import { eq, isMeaningfulNumber } from '@/functions/numberish/compare'
import { toString } from '@/functions/numberish/toString'

import useAppSettings from '../appSettings/useAppSettings'
import { loadTransaction } from '../txTools/createTransaction'
import handleMultiTx from '../txTools/handleMultiTx'
import useWallet from '../wallet/useWallet'

import { HydratedConcentratedInfo, UserPositionAccount } from './type'
import useConcentrated from './useConcentrated'

export default function txDecreaseConcentrated({
  currentAmmPool = useConcentrated.getState().currentAmmPool,
  targetUserPositionAccount = useConcentrated.getState().targetUserPositionAccount
}: {
  currentAmmPool?: HydratedConcentratedInfo
  targetUserPositionAccount?: UserPositionAccount
} = {}) {
  return handleMultiTx(async ({ transactionCollector, baseUtils: { connection, owner, allTokenAccounts } }) => {
    const { coin1, coin2, coin1Amount, coin2Amount, liquidity, targetUserPositionAccount } = useConcentrated.getState()
    const { tokenAccountRawInfos } = useWallet.getState()
    const { slippageTolerance } = useAppSettings.getState()
    assert(currentAmmPool, 'not seleted amm pool')
    assert(coin1, 'not set coin1')
    assert(coin1Amount, 'not set coin1Amount')
    assert(coin2, 'not set coin2')
    assert(coin2Amount, 'not set coin2Amount')
    assert(isMeaningfulNumber(liquidity), 'not set liquidity')
    assert(targetUserPositionAccount, 'not set targetUserPositionAccount')
    const { transaction, signers, address } = await AmmV3.makeDecreaseLiquidityTransaction({
      connection: connection,
      liquidity,
      poolInfo: currentAmmPool.state,
      ownerInfo: {
        feePayer: owner,
        wallet: owner,
        tokenAccounts: tokenAccountRawInfos,
        useSOLBalance: true,
        closePosition: eq(targetUserPositionAccount.sdkParsed.liquidity, liquidity)
      },
      slippage: Number(toString(slippageTolerance)),
      ownerPosition: targetUserPositionAccount.sdkParsed
    })
    transactionCollector.add(await loadTransaction({ transaction: transaction, signers: signers }), {
      txHistoryInfo: {
        title: 'Liquidity Removed',
        description: `Removed ${toString(coin1Amount)} ${coin1.symbol} and ${toString(coin2Amount)} ${
          coin2.symbol
        } to ${toPubString(targetUserPositionAccount.poolId).slice(0, 6)}`
      }
    })
  })
}
