import { AmmV3 } from '@raydium-io/raydium-sdk'

import assert from '@/functions/assert'
import toPubString from '@/functions/format/toMintString'
import { eq } from '@/functions/numberish/compare'
import toBN from '@/functions/numberish/toBN'
import { toString } from '@/functions/numberish/toString'

import useAppSettings from '../common/useAppSettings'
import txHandler from '../txTools/handleTx'
import useWallet from '../wallet/useWallet'

import useConcentrated from './useConcentrated'
import jFetch from '@/functions/dom/jFetch'
import { getComputeBudgetConfig } from '../txTools/getComputeBudgetConfig'

export const MANUAL_ADJUST = 0.985 // ask Rudy for detail

export default function txDecreaseConcentrated(options?: { closePosition?: boolean }) {
  return txHandler(async ({ transactionCollector, baseUtils: { connection, owner, allTokenAccounts } }) => {
    const { coin1, coin2, liquidity, targetUserPositionAccount, currentAmmPool, coin1AmountMin, coin2AmountMin } =
      useConcentrated.getState()
    const { tokenAccountRawInfos } = useWallet.getState()
    const { slippageTolerance } = useAppSettings.getState()
    assert(currentAmmPool, 'not seleted amm pool')
    assert(coin1, 'not set coin1')
    assert(coin2, 'not set coin2')
    assert(liquidity != null, 'not set liquidity')
    assert(targetUserPositionAccount, 'not set targetUserPositionAccount')
    if (options?.closePosition) {
      const { innerTransactions } = await AmmV3.makeDecreaseLiquidityInstructionSimple({
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
        // slippage: Number(toString(slippageTolerance)),
        ownerPosition: targetUserPositionAccount.sdkParsed,
        computeBudgetConfig: await getComputeBudgetConfig(),
        checkCreateATAOwner: true
      })
      transactionCollector.add(innerTransactions, {
        txHistoryInfo: {
          title: 'Position Closed',
          description: `close ${toPubString(targetUserPositionAccount.poolId).slice(0, 6)} position`
        }
      })
    } else {
      assert(coin1AmountMin, 'not set coin1AmountMin')
      assert(coin2AmountMin, 'not set coin2AmountMin')
      const { innerTransactions } = await AmmV3.makeDecreaseLiquidityInstructionSimple({
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
        amountMinA: toBN(coin1AmountMin),
        amountMinB: toBN(coin2AmountMin),
        // slippage: Number(toString(slippageTolerance)),
        ownerPosition: targetUserPositionAccount.sdkParsed,
        computeBudgetConfig: await getComputeBudgetConfig(),
        checkCreateATAOwner: true
      })
      transactionCollector.add(innerTransactions, {
        txHistoryInfo: {
          title: 'Liquidity Removed',
          description: `Removed ${toString(coin1AmountMin)} ${coin1.symbol} and ${toString(coin2AmountMin)} ${
            coin2.symbol
          } from ${toPubString(targetUserPositionAccount.poolId).slice(0, 6)}`
        }
      })
    }
  })
}
