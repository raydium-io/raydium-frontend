import { Farm, FarmCreateInstructionParamsV6 } from '@raydium-io/raydium-sdk'

import assert from '@/functions/assert'

import handleMultiTx, { AddSingleTxOptions } from '@/application/txTools/handleMultiTx'
import { createTransactionCollector } from '@/application/txTools/createTransaction'
import useCreateFarms from './useCreateFarm'
import { parseDurationAbsolute } from '@/functions/date/parseDuration'
import { div, getMax, mul } from '@/functions/numberish/operations'
import toBN from '@/functions/numberish/toBN'
import { toPub } from '@/functions/format/toMintString'
import useWallet from '../wallet/useWallet'
import { isMintEqual } from '@/functions/judgers/areEqual'
import { padZero } from '@/functions/numberish/handleZero'
import useConnection from '../connection/useConnection'
import { offsetDateTime } from '@/functions/date/dateFormat'

export default async function txCreateNewFarm(txAddOptions?: AddSingleTxOptions, txKey?: string) {
  return handleMultiTx(
    async ({ transactionCollector, baseUtils: { owner, connection } }) => {
      const { tokenAccountRawInfos } = useWallet.getState() // TODO: should add tokenAccountRawInfos to `handleMultiTx()`'s baseUtils
      const { chainTimeOffset = 0 } = useConnection.getState()
      const currentBlockChainDate = offsetDateTime(Date.now() + chainTimeOffset, { minutes: 0 /* force */ }).getTime()
      const { rewards: uiRewardInfos } = useCreateFarms.getState()
      const { tokenAccounts } = useWallet.getState()
      const piecesCollector = createTransactionCollector()
      const rewards: FarmCreateInstructionParamsV6['rewardInfos'] = uiRewardInfos.map((reward) => {
        const rewardToken = reward.token
        assert(reward.startTime, 'reward start time is required')
        assert(reward.endTime, 'reward end time is required')
        assert(reward.amount, 'reward amount is required')
        assert(rewardToken, `can't find selected reward token`)
        const durationTime = reward.endTime.getTime() - reward.startTime.getTime()
        const estimatedValue = div(reward.amount, parseDurationAbsolute(durationTime).seconds)
        const perSecondReward = toBN(mul(estimatedValue, padZero(1, rewardToken.decimals)))
        return {
          rewardOpenTime: toBN(div(getMax(reward.startTime.getTime(), currentBlockChainDate), 1000)),
          rewardEndTime: toBN(div(getMax(reward.endTime.getTime(), currentBlockChainDate), 1000)),
          rewardMint: rewardToken.mint,
          rewardPerSecond: perSecondReward
        }
      })
      const lockMint = '7WVMpKPcpDp6ezRp5uw4R1MZchQkDuFGaudCa87MA1aR' // NOTE: test
      const lockVault = 'H2StJuXebaAnSQHvbYGeokbgC1EKB6tBvY2iB2PxoUqS' // NOTE: test
      const lpMint = 'G54x5tuRV12WyNkSjfNnq3jyzfcPF9EgB8c9jTzsQKVW' // NOTE: test
      const lockMintTokenAccount = tokenAccounts.find((t) => isMintEqual(t.mint, lockMint))
      assert(lockMintTokenAccount?.publicKey, 'lockMintTokenAccount not found')
      const createFarmInstruction = await Farm.makeCreateFarmInstruction({
        poolInfo: {
          lpMint: toPub(lpMint),
          lockInfo: {
            lockMint: toPub(lockMint),
            lockVault: toPub(lockVault)
          },
          version: 6,
          rewardInfos: rewards,
          programId: Farm.getProgramId(6)
        },
        connection,
        userKeys: {
          owner,
          tokenAccounts: tokenAccountRawInfos
        }
      })
      assert(createFarmInstruction, 'createFarm valid failed')
      piecesCollector.addInstruction(...createFarmInstruction.instructions)
      piecesCollector.addSigner(...createFarmInstruction.newAccounts)
      transactionCollector.add(await piecesCollector.spawnTransaction(), {
        ...txAddOptions,
        txHistoryInfo: {
          title: 'Create Farm',
          description: `(click to see details)`
        }
      })
    },
    { txKey: txKey }
  )
}
