import { loadTransaction } from '@/application/txTools/createTransaction'
import { fractionToDecimal } from '@/application/txTools/decimal2Fraction'
import handleMultiTx from '@/application/txTools/handleMultiTx'
import useWallet from '@/application/wallet/useWallet'
import assert from '@/functions/assert'
import toFraction from '@/functions/numberish/toFraction'
import { toString } from '@/functions/numberish/toString'
import { AmmV3 } from 'test-r-sdk'
import useAppSettings from '../appSettings/useAppSettings'
import { HydratedConcentratedInfo } from './type'
import useConcentrated from './useConcentrated'

export default function txCreateConcentrated({
  currentAmmPool = useConcentrated.getState().currentAmmPool
}: {
  currentAmmPool?: HydratedConcentratedInfo
} = {}) {
  return handleMultiTx(async ({ transactionCollector, baseUtils: { connection, owner, allTokenAccounts } }) => {
    const { priceLower, priceUpper, coin1, coin2, coin1Amount, coin2Amount, liquidity } = useConcentrated.getState()
    const { tokenAccountRawInfos } = useWallet.getState()
    const { slippageTolerance } = useAppSettings.getState()
    assert(currentAmmPool, 'not seleted amm pool')
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
        useSOLBalance: true
      },
      priceLower: fractionToDecimal(toFraction(priceLower), 20),
      priceUpper: fractionToDecimal(toFraction(priceUpper), 20),
      slippage: Number(toString(slippageTolerance))
    })

    transactionCollector.add(await loadTransaction({ transaction: transaction, signers: signers }), {
      txHistoryInfo: {
        title: 'Position Created',
        description: `Added ${toString(coin1Amount)} ${coin1.symbol} and ${toString(coin2Amount)} ${coin2.symbol}`
      }
    })
  })
}
