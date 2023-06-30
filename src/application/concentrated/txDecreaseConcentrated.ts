import { AmmV3 } from '@raydium-io/raydium-sdk'

import assert from '@/functions/assert'
import toPubString from '@/functions/format/toMintString'
import { eq } from '@/functions/numberish/compare'
import toBN from '@/functions/numberish/toBN'
import { toString } from '@/functions/numberish/toString'

import txHandler from '../txTools/handleTx'
import useWallet from '../wallet/useWallet'

import { getComputeBudgetConfig } from '../txTools/getComputeBudgetConfig'
import useConcentrated from './useConcentrated'
import { shakeUndifindedItem } from '@/functions/arrayMethods'
import { toTokenAmount } from '@/functions/format/toTokenAmount'
import useNotification from '../notification/useNotification'
import { isToken2022 } from '../token/isToken2022'
import { openToken2022ClmmAmmPoolPositionConfirmPanel } from '../token/openToken2022ClmmHavestConfirmPanel'

export const MANUAL_ADJUST = 0.985 // ask Rudy for detail

export default async function txDecreaseConcentrated(options?: { closePosition?: boolean }) {
  const { coin1, coin2, liquidity, targetUserPositionAccount, currentAmmPool, coin1AmountMin, coin2AmountMin } =
    useConcentrated.getState()
  // check token 2022
  const needConfirm = [
    targetUserPositionAccount?.tokenA,
    targetUserPositionAccount?.tokenB,
    ...(targetUserPositionAccount?.rewardInfos.map((i) => i.token) ?? [])
  ].some((i) => isToken2022(i) && i)
  let userHasConfirmed: boolean
  if (needConfirm) {
    const { hasConfirmed } = openToken2022ClmmAmmPoolPositionConfirmPanel({
      ammPool: currentAmmPool,
      position: targetUserPositionAccount,
      additionalAmount: shakeUndifindedItem([
        toTokenAmount(coin1, coin1AmountMin, { alreadyDecimaled: true }),
        toTokenAmount(coin2, coin2AmountMin, { alreadyDecimaled: true })
      ])
    })
    userHasConfirmed = await hasConfirmed
  } else {
    userHasConfirmed = true
  }
  if (!userHasConfirmed) {
    useNotification.getState().logError('User Cancel', 'User has canceled token 2022 confirm')
    return
  }

  return txHandler(async ({ transactionCollector, baseUtils: { connection, owner, allTokenAccounts } }) => {
    const { coin1, coin2, liquidity, targetUserPositionAccount, currentAmmPool, coin1AmountMin, coin2AmountMin } =
      useConcentrated.getState()
    const { tokenAccountRawInfos } = useWallet.getState()
    assert(currentAmmPool, 'not seleted amm pool')
    assert(coin1, 'not set coin1')
    assert(coin2, 'not set coin2')
    assert(coin1AmountMin, 'not set coin1AmountMin')
    assert(coin2AmountMin, 'not set coin2AmountMin')
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
        ownerPosition: targetUserPositionAccount.sdkParsed,
        computeBudgetConfig: await getComputeBudgetConfig(),
        checkCreateATAOwner: true,
        amountMinA: toBN(coin1AmountMin, coin1.decimals),
        amountMinB: toBN(coin2AmountMin, coin2.decimals)
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
