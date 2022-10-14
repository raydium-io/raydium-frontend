import { AmmV3 } from 'test-r-sdk'

import { loadTransaction } from '@/application/txTools/createTransaction'
import txHandler from '@/application/txTools/handleTx'
import useWallet from '@/application/wallet/useWallet'
import assert from '@/functions/assert'
import { toString } from '@/functions/numberish/toString'

import { isQuantumSOLVersionSOL } from '../token/quantumSOL'

import { HydratedConcentratedInfo } from './type'
import useConcentrated from './useConcentrated'

export default function txCreateConcentrated({
  currentAmmPool = useConcentrated.getState().currentAmmPool
}: {
  currentAmmPool?: HydratedConcentratedInfo
} = {}) {
  return txHandler(async ({ transactionCollector, baseUtils: { connection, owner, allTokenAccounts } }) => {
    const { priceLower, priceUpper, coin1, coin2, coin1Amount, coin2Amount, liquidity, priceLowerTick, priceUpperTick } = useConcentrated.getState()
    const { tokenAccountRawInfos } = useWallet.getState()
    assert(currentAmmPool, 'not seleted amm pool')
    assert(priceUpperTick, 'not set priceUpperTick')
    assert(priceLowerTick, 'not set priceLowerTick')
    assert(priceUpper, 'not set priceUpper')
    assert(priceLower, 'not set priceLower')
    assert(coin1, 'not set coin1')
    assert(coin1Amount, 'not set coin1Amount')
    assert(coin2, 'not set coin2')
    assert(coin2Amount, 'not set coin2Amount')
    assert(liquidity, 'not set liquidity')

    const { transaction, signers, address } = await AmmV3.makeOpenPositionTransaction({
      connection: connection,
      liquidity,
      poolInfo: currentAmmPool.state,
      ownerInfo: {
        feePayer: owner,
        wallet: owner,
        tokenAccounts: tokenAccountRawInfos,
        useSOLBalance: isQuantumSOLVersionSOL(coin1) || isQuantumSOLVersionSOL(coin2)
      },
      tickLower: priceLowerTick,
      tickUpper: priceUpperTick,
      // priceLower: fractionToDecimal(toFraction(priceLower), 20),
      // priceUpper: fractionToDecimal(toFraction(priceUpper), 20),
      slippage: 0.001
    })

    transactionCollector.add(await loadTransaction({ transaction: transaction, signers: signers }), {
      txHistoryInfo: {
        title: 'Position Created',
        description: `Added ${toString(coin1Amount)} ${coin1.symbol} and ${toString(coin2Amount)} ${coin2.symbol}`
      }
    })
  })
}
