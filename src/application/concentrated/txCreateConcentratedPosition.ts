import { AmmV3 } from '@raydium-io/raydium-sdk'

import txHandler from '@/application/txTools/handleTx'
import useWallet from '@/application/wallet/useWallet'
import assert from '@/functions/assert'
import toBN from '@/functions/numberish/toBN'
import { toString } from '@/functions/numberish/toString'

import useConnection from '../connection/useConnection'
import { isQuantumSOLVersionSOL } from '../token/quantumSOL'
import { getComputeBudgetConfig } from '../txTools/getComputeBudgetConfig'

import useConcentrated, { ConcentratedStore } from './useConcentrated'
import { toTokenAmount } from '@/functions/format/toTokenAmount'
import useNotification from '../notification/useNotification'
import { isToken2022 } from '../token/isToken2022'
import { openToken2022ClmmAmountConfirmPanel } from '../token/openToken2022ClmmPositionConfirmPanel'

export default async function txCreateConcentratedPosotion({
  currentAmmPool = useConcentrated.getState().currentAmmPool,
  coin1 = useConcentrated.getState().coin1,
  coin2 = useConcentrated.getState().coin2,
  coin1Amount = useConcentrated.getState().coin1Amount,
  coin2Amount = useConcentrated.getState().coin2Amount,
  coin1SlippageAmount = useConcentrated.getState().coin1SlippageAmount,
  coin2SlippageAmount = useConcentrated.getState().coin2SlippageAmount,
  priceLower = useConcentrated.getState().priceLower,
  priceUpper = useConcentrated.getState().priceUpper,
  priceLowerTick = useConcentrated.getState().priceLowerTick,
  priceUpperTick = useConcentrated.getState().priceUpperTick,
  liquidity = useConcentrated.getState().liquidity,
  onSuccess
}: {
  onSuccess?: (utils: { nftAddress: string }) => void
} & Pick<
  ConcentratedStore,
  | 'coin1'
  | 'coin2'
  | 'coin1Amount'
  | 'coin2Amount'
  | 'coin1SlippageAmount'
  | 'coin2SlippageAmount'
  | 'liquidity'
  | 'priceLower'
  | 'priceUpper'
  | 'priceLowerTick'
  | 'priceUpperTick'
  | 'currentAmmPool'
> = {}) {
  const coin1TokenAmount = toTokenAmount(coin1, coin1Amount, { alreadyDecimaled: true })
  const coin2TokenAmount = toTokenAmount(coin2, coin2Amount, { alreadyDecimaled: true })
  // check token 2022
  const needConfirm = [coin1, coin2].some((i) => isToken2022(i))
  let userHasConfirmed: boolean
  if (needConfirm) {
    const { hasConfirmed } = openToken2022ClmmAmountConfirmPanel({
      amount: [isToken2022(coin1) ? coin1TokenAmount : undefined, isToken2022(coin2) ? coin2TokenAmount : undefined],
      groupInfo:
        currentAmmPool && priceLower && priceUpper
          ? {
              ammPool: currentAmmPool,
              priceLower,
              priceUpper
            }
          : undefined,
      caseName: 'openPosition'
    })
    // const { hasConfirmed } = openToken2022ClmmHavestConfirmPanel({ ammPool: currentAmmPool, onlyMints: [rewardInfo] })
    userHasConfirmed = await hasConfirmed
  } else {
    userHasConfirmed = true
  }
  if (!userHasConfirmed) {
    useNotification.getState().logError('Canceled by User', 'The operation is canceled by user')
    return
  }

  return txHandler(async ({ transactionCollector }) => {
    const { innerTransactions, nftAddress } = await generateCreateClmmPositionTx({
      currentAmmPool,
      coin1,
      coin2,
      coin1Amount,
      coin2Amount,
      coin1SlippageAmount,
      coin2SlippageAmount,
      liquidity,
      priceLower,
      priceUpper,
      priceLowerTick,
      priceUpperTick
    })

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

export type GenerateCreateClmmPositionTxFnParams = Pick<
  ConcentratedStore,
  | 'coin1'
  | 'coin2'
  | 'coin1Amount'
  | 'coin2Amount'
  | 'coin1SlippageAmount'
  | 'coin2SlippageAmount'
  | 'liquidity'
  | 'priceLower'
  | 'priceUpper'
  | 'priceLowerTick'
  | 'priceUpperTick'
  | 'currentAmmPool'
>

export async function generateCreateClmmPositionTx(
  {
    priceLower = useConcentrated.getState().priceLower,
    priceUpper = useConcentrated.getState().priceUpper,
    coin1 = useConcentrated.getState().coin1,
    coin2 = useConcentrated.getState().coin2,
    coin1Amount = useConcentrated.getState().coin1Amount,
    coin2Amount = useConcentrated.getState().coin2Amount,
    coin1SlippageAmount = useConcentrated.getState().coin1SlippageAmount,
    coin2SlippageAmount = useConcentrated.getState().coin2SlippageAmount,
    liquidity = useConcentrated.getState().liquidity,
    priceLowerTick = useConcentrated.getState().priceLowerTick,
    priceUpperTick = useConcentrated.getState().priceUpperTick,
    currentAmmPool = useConcentrated.getState().currentAmmPool
  }: GenerateCreateClmmPositionTxFnParams = useConcentrated.getState()
) {
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

  const coin1IsMintA = currentAmmPool.state.mintA.mint.equals(coin1.mint)

  const _coin1Amount = toBN(coin1SlippageAmount ?? coin1Amount, coin1.decimals)
  const _coin2Amount = toBN(coin2SlippageAmount ?? coin2Amount, coin2.decimals)

  const { innerTransactions, address } = await AmmV3.makeOpenPositionFromLiquidityInstructionSimple({
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
    amountMaxA: coin1IsMintA ? _coin1Amount : _coin2Amount,
    amountMaxB: !coin1IsMintA ? _coin1Amount : _coin2Amount,
    slippage: 0.015,
    computeBudgetConfig: await getComputeBudgetConfig(),
    checkCreateATAOwner: true
  })
  return { innerTransactions, nftAddress: String(address.nftMint) }
}
