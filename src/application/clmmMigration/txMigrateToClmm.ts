import assert from '@/functions/assert'
import { AmmV3, Liquidity, ZERO } from '@raydium-io/raydium-sdk'
import { PublicKey } from '@solana/web3.js'

import txHandler from '../txTools/handleTx'
import useWallet from '../wallet/useWallet'
import { getComputeBudgetConfig } from '../txTools/getComputeBudgetConfig'
import { HydratedConcentratedInfo } from '../concentrated/type'
import useLiquidity from '../liquidity/useLiquidity'
import toPubString from '@/functions/format/toMintString'
import { jsonInfo2PoolKeys } from '../txTools/jsonInfo2PoolKeys'
import { HydratedFarmInfo } from '../farms/type'
import BN from 'bn.js'
import { HydratedLiquidityInfo } from '../liquidity/type'
import useConcentrated from '../concentrated/useConcentrated'
import {
  addWalletAccountChangeListener,
  removeWalletAccountChangeListener
} from '../wallet/useWalletAccountChangeListeners'
import useFarms from '../farms/useFarms'

export default function txMigrateToClmm({
  tickLower,
  tickUpper,
  liquidity,
  amountSlippageA,
  amountSlippageB,

  farmInfo,
  liquidityInfo,
  liquidityLpAmount,
  currentClmmPool
}: {
  // create Position
  tickLower: number
  tickUpper: number
  liquidity: BN
  amountSlippageA: BN
  amountSlippageB: BN

  /** only if it is from /farm page */
  farmInfo?: HydratedFarmInfo
  liquidityInfo: HydratedLiquidityInfo
  /** only if it is from /liquidity page */
  liquidityLpAmount?: BN
  currentClmmPool?: HydratedConcentratedInfo
}) {
  return txHandler(async ({ transactionCollector, baseUtils: { connection, owner } }) => {
    const { tokenAccountRawInfos } = useWallet.getState()
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
        liquidity,
        amountSlippageA,
        amountSlippageB
      },
      removeLpAmount: liquidityLpAmount ?? ZERO,
      userKeys: {
        tokenAccounts: tokenAccountRawInfos,
        owner
      }
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
        description: `remove all lp and create clmm position`
      }
    })
  })
}
