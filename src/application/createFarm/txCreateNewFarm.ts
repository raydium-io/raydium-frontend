import { Farm } from '@raydium-io/raydium-sdk'

import { removeWalletAccountChangeListener } from '@/application/wallet/feature/useWalletAccountChangeListeners'
import assert from '@/functions/assert'

import handleMultiTx from '@/application/txTools/handleMultiTx'
import { createTransactionCollector } from '@/application/txTools/createTransaction'
import useCreateFarms from './useCreateFarm'
import { parseDurationAbsolute } from '@/functions/date/parseDuration'
import { div } from '@/functions/numberish/operations'

export default async function txFarmDeposit(rewardIndex: number) {
  return handleMultiTx(async ({ transactionCollector, baseUtils: { owner, connection } }) => {
    const piecesCollector = createTransactionCollector()
    assert(owner, 'require connected wallet')

    const uiRewardInfo = useCreateFarms.getState().rewards[rewardIndex]
    assert(uiRewardInfo, 'reward index wrong (please connect site developer)')

    const durationTime =
      uiRewardInfo.endTime && uiRewardInfo.startTime
        ? uiRewardInfo.endTime.getTime() - uiRewardInfo.startTime.getTime()
        : undefined
    const estimatedValue =
      uiRewardInfo.amount && durationTime
        ? div(uiRewardInfo.amount, parseDurationAbsolute(durationTime).days)
        : undefined
    // const {} = Farm.makeCreateFarmInstruction({
    //   payer: owner,
    //   owner,
    //   connection,
    //   lockInfo
    // })
    // transactionCollector.add(await piecesCollector.spawnTransaction(), {
    //   onTxError: () => removeWalletAccountChangeListener(listenerId),
    //   onTxSentError: () => removeWalletAccountChangeListener(listenerId),
    //   txHistoryInfo: {
    //     title: `Stake ${options.amount.token.symbol}`,
    //     description: `Stake ${options.amount.toExact()} ${options.amount.token.symbol}`
    //   }
    // })
  })
}
