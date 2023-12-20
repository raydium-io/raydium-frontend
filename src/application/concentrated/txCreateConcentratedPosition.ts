import { Clmm } from '@raydium-io/raydium-sdk'

import txHandler, { lookupTableCache } from '@/application/txTools/handleTx'
import useWallet from '@/application/wallet/useWallet'
import assert from '@/functions/assert'
import { toTokenAmount } from '@/functions/format/toTokenAmount'
import toBN from '@/functions/numberish/toBN'
import { toString } from '@/functions/numberish/toString'

import useConnection from '../connection/useConnection'
import useNotification from '../notification/useNotification'
import { isToken2022 } from '../token/isToken2022'
import { openToken2022ClmmAmountConfirmPanel } from '../token/openToken2022ClmmPositionConfirmPanel'
import { isQuantumSOLVersionSOL } from '../token/quantumSOL'
import { getComputeBudgetConfig } from '../txTools/getComputeBudgetConfig'
import { getEphemeralSigners } from '../txTools/getEphemeralSigners'

import useConcentrated, { ConcentratedStore } from './useConcentrated'

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
    const params = {
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
    }
    const { innerTransactions, nftAddress } = await generateCreateClmmPositionTx(params)

    transactionCollector.add(innerTransactions, {
      onTxAllSuccess() {
        onSuccess?.({ nftAddress })
      },
      txHistoryInfo: {
        title: 'Deposited',
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
  | 'liquidityMin'
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
    liquidityMin = useConcentrated.getState().liquidityMin,
    priceLowerTick = useConcentrated.getState().priceLowerTick,
    priceUpperTick = useConcentrated.getState().priceUpperTick,
    currentAmmPool = useConcentrated.getState().currentAmmPool
  }: GenerateCreateClmmPositionTxFnParams = useConcentrated.getState()
) {
  const { tokenAccountRawInfos, txVersion } = useWallet.getState()
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
  assert(coin1SlippageAmount, 'not set coin1Amount')
  assert(coin2, 'not set coin2')
  assert(coin2SlippageAmount, 'not set coin2Amount')

  assert(liquidity, 'not set liquidity')
  assert(liquidityMin, 'not set liquidity')
  const isSol = isQuantumSOLVersionSOL(coin1) || isQuantumSOLVersionSOL(coin2)

  const coin1IsMintA = currentAmmPool.state.mintA.mint.equals(coin1.mint)

  const _coin1Amount = toBN(coin1SlippageAmount, coin1.decimals, 'up')
  const _coin2Amount = toBN(coin2SlippageAmount, coin2.decimals, 'up')

  const { innerTransactions, address } = await Clmm.makeOpenPositionFromLiquidityInstructionSimple({
    connection: connection,
    liquidity: liquidityMin,
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
    computeBudgetConfig: await getComputeBudgetConfig(),
    checkCreateATAOwner: true,
    makeTxVersion: txVersion,
    lookupTableCache,
    getEphemeralSigners: await getEphemeralSigners()
  })
  return { innerTransactions, nftAddress: String(address.nftMint) }
}
