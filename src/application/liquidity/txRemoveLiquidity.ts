import { jsonInfo2PoolKeys, Liquidity } from 'test-r-sdk'

import useToken from '@/application/token/useToken'
import useWallet from '@/application/wallet/useWallet'
import assert from '@/functions/assert'
import { toTokenAmount } from '@/functions/format/toTokenAmount'
import { PublicKeyish } from '@/types/constants'

import useLiquidity from './useLiquidity'
import handleMultiTx from '@/application/txTools/handleMultiTx'
import { loadTransaction } from '@/application/txTools/createTransaction'

export default function txRemoveLiquidity({ ammId: targetAmmId }: { ammId?: PublicKeyish } = {}) {
  return handleMultiTx(async ({ transactionCollector, baseUtils: { owner, connection } }) => {
    assert(targetAmmId, 'should provide ammId to remove liquidity')

    const { getTokenAccount, tokenAccountRawInfos } = useWallet.getState()
    const { getToken } = useToken.getState()
    const { jsonInfos, currentJsonInfo, removeAmount } = useLiquidity.getState()
    assert(removeAmount, 'user have not input amount to remove lp')

    const targetJsonInfo = targetAmmId
      ? jsonInfos.find(({ id: ammId }) => ammId === String(targetAmmId))
      : currentJsonInfo

    assert(targetJsonInfo, `can't find target liquidity pool`)
    const lpToken = getToken(targetJsonInfo.lpMint)
    assert(lpToken, `can't find lp token in tokenList`)

    const lpTokenAccount = getTokenAccount(targetJsonInfo.lpMint)
    const removeTokenAmount = toTokenAmount(lpToken, removeAmount, { alreadyDecimaled: true })
    assert(lpTokenAccount?.publicKey, `user haven't liquidity pool's account`)

    const { transaction, signers } = await Liquidity.makeRemoveLiquidityTransaction({
      connection,
      poolKeys: jsonInfo2PoolKeys(targetJsonInfo),
      userKeys: { owner, tokenAccounts: tokenAccountRawInfos },
      amountIn: removeTokenAmount
    })
    transactionCollector.add(await loadTransaction({ transaction: transaction, signers: signers }), {
      txHistoryInfo: {
        title: 'Remove liquidity',
        description: `Remove  ${removeTokenAmount.toExact()} ${lpToken.symbol}`
      },
      onTxSuccess: () => {
        useLiquidity.setState({ removeAmount: '', isRemoveDialogOpen: false })
      }
    })
  })
}
