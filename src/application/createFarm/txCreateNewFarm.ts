import { Farm, FarmCreateInstructionParamsV6 } from '@raydium-io/raydium-sdk'

import assert from '@/functions/assert'

import handleMultiTx, { TxAddOptions } from '@/application/txTools/handleMultiTx'
import { createTransactionCollector } from '@/application/txTools/createTransaction'
import useCreateFarms from './useCreateFarm'
import { parseDurationAbsolute } from '@/functions/date/parseDuration'
import { div, mul } from '@/functions/numberish/operations'
import toBN from '@/functions/numberish/toBN'
import { toPub } from '@/functions/format/toMintString'
import useWallet from '../wallet/useWallet'
import { isMintEqual } from '@/functions/judgers/areEqual'
import { padZero } from '@/functions/numberish/handleZero'

export default async function txCreateNewFarm(txAddOptions?: TxAddOptions) {
  return handleMultiTx(async ({ transactionCollector, baseUtils: { owner, connection } }) => {
    const piecesCollector = createTransactionCollector()
    const { rewards: uiRewardInfos } = useCreateFarms.getState()
    const { tokenAccounts } = useWallet.getState()
    const testStartTime = toBN(div(Date.now(), 1000)) // NOTE: test
    const testEndTime = toBN(div(Date.now() + 1000 * 60 * 60 * 1.2, 1000)) // NOTE: test
    const rewards = uiRewardInfos.map((reward) => {
      const rewardToken = reward.token
      assert(reward.startTime, 'reward start time is required')
      assert(reward.endTime, 'reward end time is required')
      assert(reward.amount, 'reward amount is required')
      assert(rewardToken, `can't find selected reward token`)
      const rewardTokenAccount = tokenAccounts.find((t) => isMintEqual(rewardToken.mint, t.mint))
      assert(rewardTokenAccount?.publicKey, `can't find reward ${rewardToken?.symbol}'s tokenAccount `)
      const durationTime = reward.endTime.getTime() - reward.startTime.getTime()
      const estimatedValue = div(reward.amount, parseDurationAbsolute(durationTime).seconds)
      const rewardInfo = {
        rewardStartTime: testStartTime || toBN(div(reward.startTime.getTime(), 1000)),
        rewardEndTime: testEndTime || toBN(div(reward.endTime.getTime(), 1000)),
        rewardMint: rewardToken.mint,
        rewardPerSecond: toBN(mul(estimatedValue, padZero(1, rewardToken.decimals))),
        rewardOwnerAccount: rewardTokenAccount.publicKey
      } as FarmCreateInstructionParamsV6['rewardInfos'][number]
      return rewardInfo
    })

    const lockMint = '7WVMpKPcpDp6ezRp5uw4R1MZchQkDuFGaudCa87MA1aR' // NOTE: test
    const lpMint = 'G54x5tuRV12WyNkSjfNnq3jyzfcPF9EgB8c9jTzsQKVW' // NOTE: test
    const lockMintTokenAccount = tokenAccounts.find((t) => isMintEqual(t.mint, lockMint))
    assert(lockMintTokenAccount?.publicKey, 'lockMintTokenAccount not found')

    const createFarmInstruction = await Farm.makeCreateFarmInstruction({
      poolInfo: {
        lpMint: toPub(lpMint),
        version: 6,
        rewardInfos: rewards,
        programId: Farm.getProgramId(6)
      },
      connection,
      owner,
      payer: owner,
      lockInfo: {
        lockMint: toPub(lockMint), // TODO test
        userLockAccount: lockMintTokenAccount.publicKey
      }
    })

    assert(createFarmInstruction, 'createFarm valid failed')
    piecesCollector.addInstruction(...createFarmInstruction.instructions)
    piecesCollector.addSigner(createFarmInstruction.newAccount)
    transactionCollector.add(await piecesCollector.spawnTransaction(), {
      ...txAddOptions,
      txHistoryInfo: {
        title: 'Create Farm'
      }
    })
  })
}
