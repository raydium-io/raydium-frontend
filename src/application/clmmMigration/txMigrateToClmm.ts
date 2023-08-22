import { Liquidity, ZERO } from '@raydium-io/raydium-sdk'

import BN from 'bn.js'

import assert from '@/functions/assert'
import toPubString from '@/functions/format/toMintString'

import { HydratedConcentratedInfo } from '../concentrated/type'
import { HydratedFarmInfo } from '../farms/type'
import useFarms from '../farms/useFarms'
import { HydratedLiquidityInfo } from '../liquidity/type'
import useLiquidity from '../liquidity/useLiquidity'
import { getComputeBudgetConfig } from '../txTools/getComputeBudgetConfig'
import { getEphemeralSigners } from '../txTools/getEphemeralSigners'
import txHandler, { lookupTableCache } from '../txTools/handleTx'
import { jsonInfo2PoolKeys } from '../txTools/jsonInfo2PoolKeys'
import useWallet from '../wallet/useWallet'
import {
  addWalletAccountChangeListener, removeWalletAccountChangeListener
} from '../wallet/useWalletAccountChangeListeners'

export default function txMigrateToClmm({
  tickLower,
  tickUpper,
  liquidity,
  amountMaxA,
  amountMaxB,

  farmInfo,
  liquidityInfo,
  liquidityLpAmount,
  currentClmmPool
}: {
  // create Position
  tickLower: number
  tickUpper: number
  liquidity: BN
  amountMaxA: BN
  amountMaxB: BN

  /** only if it is from /farm page */
  farmInfo?: HydratedFarmInfo
  liquidityInfo: HydratedLiquidityInfo
  /** only if it is from /liquidity page */
  liquidityLpAmount?: BN
  currentClmmPool?: HydratedConcentratedInfo
}) {
  return txHandler(async ({ transactionCollector, baseUtils: { connection, owner } }) => {
    const { tokenAccountRawInfos, txVersion } = useWallet.getState()
    assert(currentClmmPool, 'not seleted clmm pool')

    const { jsonInfos } = useLiquidity.getState()
    const targetJsonInfo = jsonInfos.find(({ id: ammId }) => ammId === toPubString(liquidityInfo.id))
    assert(targetJsonInfo, `can't find liquidity pool`)

    const { innerTransactions } = await Liquidity.makeRemoveAllLpAndCreateClmmPosition({
      connection: connection,
      poolKeys: jsonInfo2PoolKeys(targetJsonInfo),
      clmmPoolKeys: currentClmmPool.state,
      farmInfo: farmInfo
        ? {
          poolKeys: jsonInfo2PoolKeys(farmInfo.jsonInfo),
          amount: farmInfo.userStakedLpAmount?.raw ?? ZERO /* actually, will never use this  */
        }
        : undefined,
      createPositionInfo: {
        tickLower,
        tickUpper,
        liquidity: liquidity.mul(new BN(99)).div(new BN(100)),
        amountMaxA: amountMaxA,
        amountMaxB: amountMaxB
      },
      removeLpAmount: liquidityLpAmount ?? ZERO,
      userKeys: {
        tokenAccounts: tokenAccountRawInfos,
        owner
      },
      computeBudgetConfig: await getComputeBudgetConfig(),
      checkCreateATAOwner: true,

      getEphemeralSigners: await getEphemeralSigners(),

      makeTxVersion: txVersion,
      lookupTableCache,
    })
    const listenerId = addWalletAccountChangeListener(
      () => {
        useFarms.getState().refreshFarmInfos()
      },
      { once: true }
    )
    transactionCollector.add(innerTransactions, {
      onTxError: () => removeWalletAccountChangeListener(listenerId),
      onTxSentError: () => removeWalletAccountChangeListener(listenerId),
      onTxAllSuccess: () => {
        setTimeout(() => {
          useFarms.getState().refreshFarmInfos()
          removeWalletAccountChangeListener(listenerId)
        }, 1000)
      },
      txHistoryInfo: {
        title: 'Migrate To CLMM',
        description: `Migrate LP to CLMM position`
      }
    })
  })
}
