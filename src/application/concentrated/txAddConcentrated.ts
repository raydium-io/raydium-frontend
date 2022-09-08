import useWallet from '@/application/wallet/useWallet'
import assert from '@/functions/assert'
import { toString } from '@/functions/numberish/toString'
import { PublicKeyish } from '@/types/constants'

import { loadTransaction } from '@/application/txTools/createTransaction'
import {
  decimalToFraction,
  fractionToDecimal,
  recursivelyDecimalToFraction
} from '@/application/txTools/decimal2Fraction'
import handleMultiTx from '@/application/txTools/handleMultiTx'
import toFraction from '@/functions/numberish/toFraction'
import { AmmV3 } from 'test-r-sdk'
import useAppSettings from '../appSettings/useAppSettings'
import useConnection from '../connection/useConnection'
import useConcentrated from './useConcentrated'

export default function txAddConcentrated({ ammId: targetAmmId }: { ammId?: PublicKeyish } = {}) {
  return handleMultiTx(async ({ transactionCollector, baseUtils: { connection, owner } }) => {
    const { currentAmmPool, priceLower, priceUpper, coin1, coin2, coin1Amount, coin2Amount, liquidity } =
      useConcentrated.getState()
    const { testConnection } = useConnection.getState()
    const { tokenAccountRawInfos } = useWallet.getState()

    const { slippageTolerance } = useAppSettings.getState()
    assert(currentAmmPool, 'not seleted amm pool')
    assert(testConnection, 'no connection')
    assert(priceUpper, 'not set priceUpper')
    assert(priceLower, 'not set priceLower')
    assert(coin1, 'not set coin1')
    assert(coin1Amount, 'not set coin1Amount')
    assert(coin2, 'not set coin2')
    assert(coin2Amount, 'not set coin2Amount')
    assert(liquidity, 'not set liquidity')

    const { transaction, signers, address } = await AmmV3.makeOpenPositionTransaction({
      connection: testConnection,
      liquidity,
      poolInfo: currentAmmPool.state,
      ownerInfo: {
        feePayer: owner,
        wallet: owner,
        tokenAccounts: tokenAccountRawInfos,
        useSOLBalance: true
      },
      priceLower: fractionToDecimal(toFraction(priceLower)),
      priceUpper: fractionToDecimal(toFraction(priceUpper)),
      slippage: Number(toString(slippageTolerance))
    })

    transactionCollector.add(await loadTransaction({ transaction: transaction, signers: signers }), {
      txHistoryInfo: {
        title: 'Add Concentrated',
        description: `Add ${toString(coin1Amount)} ${coin1.symbol} and ${toString(coin2Amount)} ${coin2.symbol}`
      }
    })
  })
}

export function getNearistDataPoint(info: Parameters<typeof AmmV3['getPriceAndTick']>[0]) {
  return recursivelyDecimalToFraction(AmmV3.getPriceAndTick(info))
}
