import txHandler from '@/application/txTools/handleTx'
import useWallet from '@/application/wallet/useWallet'
import assert from '@/functions/assert'
import { toString } from '@/functions/numberish/toString'
import { AmmV3 } from '@raydium-io/raydium-sdk'
import useConnection from '../connection/useConnection'
import { isQuantumSOLVersionSOL } from '../token/quantumSOL'
import { getComputeBudgetConfig } from '../txTools/getComputeBudgetConfig'
import { HydratedConcentratedInfo } from './type'
import useConcentrated from './useConcentrated'
import toBN from '@/functions/numberish/toBN'
import { toHumanReadable } from '@/functions/format/toHumanReadable'
import { isToken2022 } from '../token/isToken2022'
import useNotification from '../notification/useNotification'
import { openToken2022ClmmAmountConfirmPanel } from '../token/openToken2022ClmmHavestConfirmPanel'
import { toTokenAmount } from '@/functions/format/toTokenAmount'

export default async function txCreateConcentratedPosotion({
  currentAmmPool = useConcentrated.getState().currentAmmPool,
  onSuccess
}: {
  currentAmmPool?: HydratedConcentratedInfo
  onSuccess?: (utils: { nftAddress: string }) => void
} = {}) {
  const { coin1, coin2, coin1Amount, coin2Amount } = useConcentrated.getState()

  const coin1TokenAmount = toTokenAmount(coin1, coin1Amount)
  const coin2TokenAmount = toTokenAmount(coin2, coin2Amount)
  // check token 2022
  const needConfirm = [coin1, coin2].some((i) => isToken2022(i))
  let userHasConfirmed: boolean
  if (needConfirm) {
    const { hasConfirmed } = openToken2022ClmmAmountConfirmPanel({
      amount: [isToken2022(coin1) ? coin1TokenAmount : undefined, isToken2022(coin2) ? coin2TokenAmount : undefined]
    })
    // const { hasConfirmed } = openToken2022ClmmHavestConfirmPanel({ ammPool: currentAmmPool, onlyMints: [rewardInfo] })
    userHasConfirmed = await hasConfirmed
  } else {
    userHasConfirmed = true
  }
  if (!userHasConfirmed) {
    useNotification.getState().logError('User Cancel', 'User has canceled token 2022 confirm')
    return
  }

  return txHandler(async ({ transactionCollector }) => {
    const { innerTransactions, nftAddress } = await generateCreateClmmPositionTx(currentAmmPool)

    transactionCollector.add(innerTransactions, {
      onTxAllSuccess() {
        onSuccess?.({ nftAddress })
      },
      txHistoryInfo: {
        title: 'Position Created',
        forceErrorTitle: 'Error creating position',
        description: `Added ${toString(coin1Amount)} ${coin1?.symbol ?? '--'} and ${toString(coin2Amount)} ${
          coin2?.symbol ?? '--'
        }`
      }
    })
  })
}

export async function generateCreateClmmPositionTx(currentAmmPool = useConcentrated.getState().currentAmmPool) {
  const {
    priceLower,
    priceUpper,
    coin1,
    coin2,
    coin1Amount,
    coin2Amount,
    coin1SlippageAmount,
    coin2SlippageAmount,
    liquidity,
    priceLowerTick,
    priceUpperTick
  } = useConcentrated.getState()
  const { tokenAccountRawInfos } = useWallet.getState()
  const { connection } = useConnection.getState()
  const { owner } = useWallet.getState()
  assert(connection, 'no rpc connection')
  assert(owner, 'wallet not connected')
  assert(currentAmmPool, 'not seleted amm pool')
  assert(priceUpperTick !== undefined, 'not set priceUpperTick')
  assert(priceLowerTick !== undefined, 'not set priceLowerTick')
  assert(priceUpper, 'not set priceUpper')
  assert(priceLower, 'not set priceLower')
  assert(coin1, 'not set coin1')
  assert(coin1Amount, 'not set coin1Amount')
  assert(coin2, 'not set coin2')
  assert(coin2Amount, 'not set coin2Amount')

  assert(liquidity, 'not set liquidity')
  const isSol = isQuantumSOLVersionSOL(coin1) || isQuantumSOLVersionSOL(coin2)

  const { innerTransactions, address } = await AmmV3.makeOpenPositionInstructionSimple({
    connection: connection,
    liquidity,
    poolInfo: currentAmmPool.state,
    ownerInfo: {
      feePayer: owner,
      wallet: owner,
      tokenAccounts: tokenAccountRawInfos,
      useSOLBalance: isSol
    },
    tickLower: Math.min(priceLowerTick, priceUpperTick),
    tickUpper: Math.max(priceLowerTick, priceUpperTick),
    amountSlippageA: toBN(coin1SlippageAmount ?? coin1Amount, coin1.decimals),
    amountSlippageB: toBN(coin2SlippageAmount ?? coin2Amount, coin2.decimals),
    slippage: 0.015,
    computeBudgetConfig: await getComputeBudgetConfig(),
    checkCreateATAOwner: true
  })
  return { innerTransactions, nftAddress: String(address.nftMint) }
}
