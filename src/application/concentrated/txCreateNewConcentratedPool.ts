import assert from '@/functions/assert'
import txHandler from '../txTools/handleTx'
import { GenerateCreateClmmPositionTxFnParams, generateCreateClmmPositionTx } from './txCreateConcentratedPosition'
import useConcentrated from './useConcentrated'
import useNotification from '../notification/useNotification'
import { isToken2022 } from '../token/isToken2022'
import { openToken2022ClmmAmountConfirmPanel } from '../token/openToken2022ClmmPositionConfirmPanel'
import { toTokenAmount } from '@/functions/format/toTokenAmount'

export default async function txCreateNewConcentratedPool(
  payload: GenerateCreateClmmPositionTxFnParams = useConcentrated.getState()
) {
  const { coin1, coin2, coin1Amount, coin2Amount } = payload

  const coin1TokenAmount = toTokenAmount(coin1, coin1Amount, { alreadyDecimaled: true })
  const coin2TokenAmount = toTokenAmount(coin2, coin2Amount, { alreadyDecimaled: true })
  // check token 2022
  const needConfirm = [coin1, coin2].some((i) => isToken2022(i) && i)
  let userHasConfirmed: boolean
  if (needConfirm) {
    const { hasConfirmed } = openToken2022ClmmAmountConfirmPanel({ amount: [coin1TokenAmount, coin2TokenAmount] })
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
    const { tempDataCache } = useConcentrated.getState()
    assert(tempDataCache, 'should create pool first')
    const createPoolInnerTransaction = tempDataCache
    const { innerTransactions: openPositionInnerTransaction } = await generateCreateClmmPositionTx(payload)

    transactionCollector.add(createPoolInnerTransaction, {
      txHistoryInfo: { title: 'Create pool', description: `create clmm pool` }
    })

    transactionCollector.add(openPositionInnerTransaction, {
      txHistoryInfo: { title: 'Open pool position', description: `Open clmm pool position` }
    })
  })
}
