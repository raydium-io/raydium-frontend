import txHandler from '@/application/txTools/handleTx'
import useWallet from '@/application/wallet/useWallet'
import assert from '@/functions/assert'
import { toString } from '@/functions/numberish/toString'
import { AmmV3 } from '@raydium-io/raydium-sdk'
import useAppSettings from '../common/useAppSettings'
import useConnection from '../connection/useConnection'
import { isQuantumSOLVersionSOL } from '../token/quantumSOL'
import { HydratedConcentratedInfo } from './type'
import useConcentrated from './useConcentrated'

export default function txCreateConcentratedPosotion({
  currentAmmPool = useConcentrated.getState().currentAmmPool
}: {
  currentAmmPool?: HydratedConcentratedInfo
} = {}) {
  return txHandler(async ({ transactionCollector }) => {
    const { coin1, coin2, coin1Amount, coin2Amount } = useConcentrated.getState()
    const { transaction, signers } = await generateCreateClmmPositionTx(currentAmmPool)
    transactionCollector.add(
      { transaction, signers },
      {
        txHistoryInfo: {
          title: 'Position Created',
          forceErrorTitle: 'Error creating position',
          description: `Added ${toString(coin1Amount)} ${coin1?.symbol ?? '--'} and ${toString(coin2Amount)} ${
            coin2?.symbol ?? '--'
          }`
        }
      }
    )
  })
}

export async function generateCreateClmmPositionTx(currentAmmPool = useConcentrated.getState().currentAmmPool) {
  const { priceLower, priceUpper, coin1, coin2, coin1Amount, coin2Amount, liquidity, priceLowerTick, priceUpperTick } =
    useConcentrated.getState()
  const { tokenAccountRawInfos } = useWallet.getState()
  const { slippageTolerance } = useAppSettings.getState()
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
  const { transaction, signers } = await AmmV3.makeOpenPositionTransaction({
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
    slippage: 0.015
  })
  return { transaction, signers }
}
