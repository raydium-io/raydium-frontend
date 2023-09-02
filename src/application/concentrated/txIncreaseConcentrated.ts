import { Clmm } from '@raydium-io/raydium-sdk'

import assert from '@/functions/assert'
import toPubString from '@/functions/format/toMintString'
import { isMeaningfulNumber } from '@/functions/numberish/compare'
import { toString } from '@/functions/numberish/toString'
import { isQuantumSOLVersionSOL } from '../token/quantumSOL'
import txHandler, { lookupTableCache } from '../txTools/handleTx'
import useWallet from '../wallet/useWallet'
import { shakeUndifindedItem } from '@/functions/arrayMethods'
import { toTokenAmount } from '@/functions/format/toTokenAmount'
import toBN from '@/functions/numberish/toBN'
import useNotification from '../notification/useNotification'
import { isToken2022 } from '../token/isToken2022'
import { openToken2022ClmmAmountConfirmPanel } from '../token/openToken2022ClmmPositionConfirmPanel'
import { getComputeBudgetConfig } from '../txTools/getComputeBudgetConfig'
import { HydratedConcentratedInfo, UserPositionAccount } from './type'
import useConcentrated from './useConcentrated'

export default async function txIncreaseConcentrated({
  currentAmmPool = useConcentrated.getState().currentAmmPool,
  targetUserPositionAccount = useConcentrated.getState().targetUserPositionAccount
}: {
  currentAmmPool?: HydratedConcentratedInfo
  targetUserPositionAccount?: UserPositionAccount
} = {}) {
  const { coin1, coin2, coin1Amount, coin2Amount, coin1SlippageAmount, coin2SlippageAmount, liquidity } =
    useConcentrated.getState()
  // check token 2022
  const needConfirm = [
    targetUserPositionAccount?.tokenA,
    targetUserPositionAccount?.tokenB,
    ...(targetUserPositionAccount?.rewardInfos.map((i) => i.token) ?? [])
  ].some((i) => isToken2022(i) && i)
  let userHasConfirmed: boolean
  if (needConfirm) {
    const { hasConfirmed } = openToken2022ClmmAmountConfirmPanel({
      caseName: 'increase',
      groupInfo: targetUserPositionAccount
        ? {
          ammPool: targetUserPositionAccount.ammPool,
          priceLower: targetUserPositionAccount.priceLower,
          priceUpper: targetUserPositionAccount.priceUpper
        }
        : undefined,
      amount: shakeUndifindedItem([
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

  return txHandler(async ({ transactionCollector, baseUtils: { connection, owner } }) => {
    const { tokenAccountRawInfos, txVersion } = useWallet.getState()
    assert(currentAmmPool, 'not seleted amm pool')
    assert(coin1, 'not set coin1')
    assert(coin1SlippageAmount, 'not set coin1Amount')
    assert(coin2, 'not set coin2')
    assert(coin2SlippageAmount, 'not set coin2Amount')
    assert(isMeaningfulNumber(liquidity), 'not set liquidity')
    assert(targetUserPositionAccount, 'not set targetUserPositionAccount')
    const { innerTransactions } = await Clmm.makeIncreasePositionFromLiquidityInstructionSimple({
      connection: connection,
      liquidity,
      poolInfo: currentAmmPool.state,
      ownerInfo: {
        feePayer: owner,
        wallet: owner,
        tokenAccounts: tokenAccountRawInfos,
        useSOLBalance: isQuantumSOLVersionSOL(coin1) || isQuantumSOLVersionSOL(coin2)
      },
      ownerPosition: targetUserPositionAccount.sdkParsed,
      computeBudgetConfig: await getComputeBudgetConfig(),
      checkCreateATAOwner: true,
      amountMaxA: toBN(coin1SlippageAmount, coin1.decimals, 'up'),
      amountMaxB: toBN(coin2SlippageAmount, coin2.decimals, 'up'),
      makeTxVersion: txVersion,
      lookupTableCache
    })
    transactionCollector.add(innerTransactions, {
      txHistoryInfo: {
        title: 'Liquidity Added',
        description: `Added ${toString(coin1SlippageAmount)} ${coin1.symbol} and ${toString(coin2SlippageAmount)} ${coin2.symbol
          } to ${toPubString(targetUserPositionAccount.poolId).slice(0, 6)}`
      }
    })
  })
}
