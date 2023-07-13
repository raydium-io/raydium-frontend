import { AmmV3 } from '@raydium-io/raydium-sdk'

import { shakeUndifindedItem } from '@/functions/arrayMethods'
import assert from '@/functions/assert'
import toPubString from '@/functions/format/toMintString'
import { toTokenAmount } from '@/functions/format/toTokenAmount'
import { eq } from '@/functions/numberish/compare'
import toBN from '@/functions/numberish/toBN'
import { toString } from '@/functions/numberish/toString'
import useNotification from '../notification/useNotification'
import { getTransferFeeInfos } from '../token/getTransferFeeInfos'
import { isToken2022 } from '../token/isToken2022'
import { openToken2022ClmmPositionConfirmPanel } from '../token/openToken2022ClmmPositionConfirmPanel'
import { getComputeBudgetConfig } from '../txTools/getComputeBudgetConfig'
import txHandler from '../txTools/handleTx'
import useWallet from '../wallet/useWallet'
import useConcentrated from './useConcentrated'

export const MANUAL_ADJUST = 0.985 // ask Rudy for detail

export default async function txDecreaseConcentrated(options?: { closePosition?: boolean }) {
  const {
    coin1,
    coin2,
    liquidity,
    targetUserPositionAccount,
    currentAmmPool,
    coin1Amount,
    coin2Amount,
    coin1AmountMin,
    coin2AmountMin
  } = useConcentrated.getState()
  const { tokenAccountRawInfos } = useWallet.getState()
  assert(currentAmmPool, 'not seleted amm pool')
  assert(coin1, 'not set coin1')
  assert(coin2, 'not set coin2')
  assert(coin1AmountMin, 'not set coin1AmountMin')
  assert(coin2AmountMin, 'not set coin2AmountMin')
  assert(liquidity != null, 'not set liquidity')
  assert(targetUserPositionAccount, 'not set targetUserPositionAccount')

  const tokenAmount1 = toTokenAmount(coin1, coin1AmountMin, { alreadyDecimaled: true })
  const feeInfo1 = isToken2022(coin1) ? getTransferFeeInfos({ amount: tokenAmount1 }) : undefined

  const tokenAmount2 = toTokenAmount(coin2, coin2AmountMin, { alreadyDecimaled: true })
  const feeInfo2 = isToken2022(coin2) ? getTransferFeeInfos({ amount: tokenAmount2 }) : undefined

  // check token 2022
  const needConfirm = [
    targetUserPositionAccount?.tokenA,
    targetUserPositionAccount?.tokenB,
    ...(targetUserPositionAccount?.rewardInfos.map((i) => i.token) ?? [])
  ].some((i) => isToken2022(i) && i)
  let userHasConfirmed: boolean
  if (needConfirm) {
    const { hasConfirmed } = openToken2022ClmmPositionConfirmPanel({
      caseName: 'decrease',
      position: targetUserPositionAccount,
      positionAdditionalAmount: shakeUndifindedItem([
        toTokenAmount(coin1, coin1Amount, { alreadyDecimaled: true }),
        toTokenAmount(coin2, coin2Amount, { alreadyDecimaled: true })
      ])
    })
    userHasConfirmed = await hasConfirmed
  } else {
    userHasConfirmed = true
  }
  if (!userHasConfirmed) {
    useNotification.getState().logError('Canceled by User', 'The operation is canceled by user')
    return
  }

  return txHandler(async ({ transactionCollector, baseUtils: { connection, owner, allTokenAccounts } }) => {
    const [feeInfoA, feeInfoB] = await Promise.all([feeInfo1, feeInfo2])
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
        ownerPosition: targetUserPositionAccount.sdkParsed,
        computeBudgetConfig: await getComputeBudgetConfig(),
        checkCreateATAOwner: true,
        amountMinA: toBN(feeInfoA?.pure ?? coin1AmountMin, coin1.decimals),
        amountMinB: toBN(feeInfoB?.pure ?? coin2AmountMin, coin2.decimals)
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
        amountMinA: toBN(feeInfoA?.pure ?? coin1AmountMin, coin1.decimals),
        amountMinB: toBN(feeInfoB?.pure ?? coin2AmountMin, coin2.decimals),
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
