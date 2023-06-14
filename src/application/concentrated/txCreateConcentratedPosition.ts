import txHandler from '@/application/txTools/handleTx'
import useWallet from '@/application/wallet/useWallet'
import assert from '@/functions/assert'
import { toString } from '@/functions/numberish/toString'
import { AmmV3 } from '@raydium-io/raydium-sdk'
import useConnection from '../connection/useConnection'
import { isQuantumSOLVersionSOL } from '../token/quantumSOL'
import { getComputeBudgetConfig } from '../txTools/getComputeBudgetConfig'
import useConcentrated, { ConcentratedStore } from './useConcentrated'

export default function txCreateConcentratedPosotion({
  currentAmmPool = useConcentrated.getState().currentAmmPool,
  coin1 = useConcentrated.getState().coin1,
  coin2 = useConcentrated.getState().coin2,
  coin1Amount = useConcentrated.getState().coin1Amount,
  coin2Amount = useConcentrated.getState().coin2Amount,
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
  | 'liquidity'
  | 'priceLower'
  | 'priceUpper'
  | 'priceLowerTick'
  | 'priceUpperTick'
  | 'currentAmmPool'
> = {}) {
  return txHandler(async ({ transactionCollector }) => {
    const { innerTransactions, nftAddress } = await generateCreateClmmPositionTx({
      currentAmmPool,
      coin1,
      coin2,
      coin1Amount,
      coin2Amount,
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

export async function generateCreateClmmPositionTx({
  priceLower = useConcentrated.getState().priceLower,
  priceUpper = useConcentrated.getState().priceUpper,
  coin1 = useConcentrated.getState().coin1,
  coin2 = useConcentrated.getState().coin2,
  coin1Amount = useConcentrated.getState().coin1Amount,
  coin2Amount = useConcentrated.getState().coin2Amount,
  liquidity = useConcentrated.getState().liquidity,
  priceLowerTick = useConcentrated.getState().priceLowerTick,
  priceUpperTick = useConcentrated.getState().priceUpperTick,
  currentAmmPool = useConcentrated.getState().currentAmmPool
}: Pick<
  ConcentratedStore,
  | 'coin1'
  | 'coin2'
  | 'coin1Amount'
  | 'coin2Amount'
  | 'liquidity'
  | 'priceLower'
  | 'priceUpper'
  | 'priceLowerTick'
  | 'priceUpperTick'
  | 'currentAmmPool'
> = {}) {
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
    // priceLower: fractionToDecimal(toFraction(priceLower), 20),
    // priceUpper: fractionToDecimal(toFraction(priceUpper), 20),
    slippage: 0.015,
    computeBudgetConfig: await getComputeBudgetConfig(),
    checkCreateATAOwner: true
  })
  return { innerTransactions, nftAddress: String(address.nftMint) }
}
