import { jsonInfo2PoolKeys, Liquidity } from '@raydium-io/raydium-sdk'

import { deUITokenAmount } from '@/application/token/quantumSOL'
import useWallet from '@/application/wallet/useWallet'
import assert from '@/functions/assert'
import { toTokenAmount } from '@/functions/format/toTokenAmount'
import { gt } from '@/functions/numberish/compare'
import { toString } from '@/functions/numberish/toString'
import { PublicKeyish } from '@/types/constants'

import useLiquidity from './useLiquidity'
import handleMultiTx from '@/application/txTools/handleMultiTx'
import { loadTransaction } from '@/application/txTools/createTransaction'

export default function txAddLiquidity({ ammId: targetAmmId }: { ammId?: PublicKeyish } = {}) {
  return handleMultiTx(async ({ transactionCollector, baseUtils: { connection, owner } }) => {
    const { checkWalletHasEnoughBalance, tokenAccountRawInfos } = useWallet.getState()
    const {
      coin1,
      coin2,
      coin1Amount,
      coin2Amount,
      focusSide,
      jsonInfos,
      currentJsonInfo,
      unslippagedCoin1Amount,
      unslippagedCoin2Amount
    } = useLiquidity.getState()

    const targetJsonInfo = targetAmmId
      ? jsonInfos.find(({ id: ammId }) => ammId === String(targetAmmId))
      : currentJsonInfo

    assert(targetJsonInfo, `can't find liquidity pool`)
    assert(coin1, 'select a coin in upper box')
    assert(coin2, 'select a coin in lower box')
    assert(String(coin1.mint) !== String(coin2.mint), 'should not select same mint ')
    assert(coin1Amount && gt(coin1Amount, 0), 'should input coin1 amount larger than 0')
    assert(coin2Amount && gt(coin2Amount, 0), 'should input coin2 amount larger than 0')

    const coin1TokenAmount = toTokenAmount(coin1, coin1Amount, { alreadyDecimaled: true })
    const coin2TokenAmount = toTokenAmount(coin2, coin2Amount, { alreadyDecimaled: true })

    const unslippagedCoin1TokenAmount = toTokenAmount(coin1, unslippagedCoin1Amount ?? coin1Amount, {
      alreadyDecimaled: true
    })
    const unslippagedCoin2TokenAmount = toTokenAmount(coin2, unslippagedCoin2Amount ?? coin2Amount, {
      alreadyDecimaled: true
    })

    assert(
      checkWalletHasEnoughBalance(focusSide === 'coin1' ? coin1TokenAmount : unslippagedCoin1TokenAmount),
      `not enough ${coin1.symbol}`
    )
    assert(
      checkWalletHasEnoughBalance(focusSide === 'coin2' ? coin2TokenAmount : unslippagedCoin2TokenAmount),
      `not enough ${coin2.symbol}`
    )
    const { transaction, signers } = await Liquidity.makeAddLiquidityTransaction({
      connection,
      poolKeys: jsonInfo2PoolKeys(targetJsonInfo),
      userKeys: { tokenAccounts: tokenAccountRawInfos, owner },
      amountInA: deUITokenAmount(coin1TokenAmount),
      amountInB: deUITokenAmount(coin2TokenAmount),
      fixedSide: focusSide === 'coin1' ? 'a' : 'b'
    })
    transactionCollector.add(await loadTransaction({ transaction: transaction, signers: signers }), {
      txHistoryInfo: {
        title: 'Add liquidity',
        description: `Add ${toString(coin1Amount)} ${coin1.symbol} and ${toString(coin2Amount)} ${coin2.symbol}`
      }
    })
  })
}
