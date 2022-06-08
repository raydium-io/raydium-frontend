import { Farm, FarmCreateInstructionParamsV6, jsonInfo2PoolKeys } from '@raydium-io/raydium-sdk'

import assert from '@/functions/assert'

import handleMultiTx, { TxAddOptions } from '@/application/txTools/handleMultiTx'
import { createTransactionCollector } from '@/application/txTools/createTransaction'
import useCreateFarms from './useCreateFarm'
import { parseDurationAbsolute } from '@/functions/date/parseDuration'
import { div, getMax, mul } from '@/functions/numberish/operations'
import toBN from '@/functions/numberish/toBN'
import toPubString, { toPub } from '@/functions/format/toMintString'
import useWallet from '../wallet/useWallet'
import { isMintEqual } from '@/functions/judgers/areEqual'
import useFarms from '../farms/useFarms'
import { HydratedFarmInfo } from '../farms/type'
import { UIRewardInfo } from './type'
import { TransactionInstruction } from '@solana/web3.js'
import { hasRewardBeenEdited } from './parseRewardInfo'
import { padZero } from '@/functions/numberish/handleZero'
import asyncMap from '@/functions/asyncMap'
import useConnection from '../connection/useConnection'
import { offsetDateTime } from '@/functions/date/dateFormat'
import { toHumanReadable } from '@/functions/format/toHumanReadable'
import { toTokenAmount } from '@/functions/format/toTokenAmount'

export default async function txUpdateEdited({ ...txAddOptions }: TxAddOptions) {
  return handleMultiTx(async ({ transactionCollector, baseUtils: { owner, connection } }) => {
    const piecesCollector = createTransactionCollector()

    // ---------- generate basic info ----------
    const { hydratedInfos } = useFarms.getState()
    const { rewards: uiRewardInfos, farmId: targetFarmId } = useCreateFarms.getState()
    const farmInfo = hydratedInfos.find((f) => toPubString(f.id) === targetFarmId)
    assert(targetFarmId, 'target farm id is missing')
    assert(farmInfo, "can't find target farm")
    const restartRewards = uiRewardInfos.filter((r) => hasRewardBeenEdited(r) && r.type === 'existed reward')
    const createNewRewards = uiRewardInfos.filter((r) => r.type === 'new added')

    // ---------- restart ----------

    piecesCollector.addInstruction(
      ...restartRewards.map((r) => createRewardRestartInstruction({ reward: r, farmInfo }))
    )

    // ---------- create new ----------
    piecesCollector.addEndInstruction(
      ...(await asyncMap(createNewRewards, async (r) => createNewRewardInstruction({ reward: r, farmInfo })))
    )

    transactionCollector.add(await piecesCollector.spawnTransaction(), {
      ...txAddOptions,
      txHistoryInfo: {
        title: 'Edit Farm',
        description: '(click to see details)'
      }
    })
  })
}

function createRewardRestartInstruction({
  reward,
  farmInfo
}: {
  reward: UIRewardInfo
  farmInfo: HydratedFarmInfo
}): TransactionInstruction {
  const { tokenAccounts, owner } = useWallet.getState()
  assert(isMintEqual(owner, reward.owner), `reward is not created by walletOwner`)

  const { chainTimeOffset = 0 } = useConnection.getState()
  const currentBlockChainDate = offsetDateTime(Date.now() + chainTimeOffset, { minutes: 5 /* force */ }).getTime()

  const testRestartTime = Date.now() // NOTE: test
  const testEndTime = Date.now() + 1000 * 60 * 60 * 1.2 // NOTE: test

  const rewardTokenAccount = tokenAccounts.find((t) => isMintEqual(reward.token?.mint, t.mint))
  assert(rewardTokenAccount?.publicKey, `can't find reward ${reward.token?.symbol}'s tokenAccount`)
  assert(reward.endTime, `reward must have endTime`)
  assert(reward.startTime, `reward must have startTime`)
  assert(reward.amount, `reward must have amount`)
  assert(reward.owner, 'reward must have creator')
  const durationTime = reward.endTime.getTime() - reward.startTime.getTime()
  const perSecond = div(reward.amount, parseDurationAbsolute(durationTime).seconds)

  const createFarmInstruction = Farm.makeRestartFarmInstruction({
    poolKeys: jsonInfo2PoolKeys(farmInfo.jsonInfo),
    rewardVault: toPub(String(reward.id)),
    rewardRestartTime: toBN(
      div(getMax(testRestartTime || reward.startTime.getTime(), currentBlockChainDate), 1000)
    ).toNumber(),
    rewardEndTime: toBN(div(getMax(testEndTime || reward.endTime.getTime(), currentBlockChainDate), 1000)).toNumber(),
    rewardPerSecond: toBN(mul(perSecond, padZero('1', reward.token?.decimals ?? 6))),
    rewardOwner: toPub(reward.owner),
    rewardOwnerAccount: rewardTokenAccount.publicKey
  })

  assert(createFarmInstruction, 'createFarm valid failed')
  return createFarmInstruction
}

async function createNewRewardInstruction({
  reward,
  farmInfo
}: {
  reward: UIRewardInfo
  farmInfo: HydratedFarmInfo
}): Promise<TransactionInstruction> {
  const { tokenAccounts, owner } = useWallet.getState()

  const { chainTimeOffset = 0 } = useConnection.getState()
  const currentBlockChainDate = offsetDateTime(Date.now() + chainTimeOffset, { minutes: 5 /* force */ }).getTime()

  const testStartTime = Date.now() // NOTE: test
  const testEndTime = Date.now() + 1000 * 60 * 60 * 1.5 // NOTE: test

  assert(owner, 'wallet not connected')
  const rewardToken = reward.token
  assert(reward.startTime, 'reward start time is required')
  assert(reward.endTime, 'reward end time is required')
  assert(reward.amount, 'reward amount is required')
  assert(rewardToken, `can't find selected reward token`)
  const rewardTokenAccount = tokenAccounts.find((t) => isMintEqual(rewardToken.mint, t.mint))
  assert(rewardTokenAccount?.publicKey, `can't find reward ${rewardToken?.symbol}'s tokenAccount `)
  const durationTime = reward.endTime.getTime() - reward.startTime.getTime()
  const estimatedValue = div(reward.amount, parseDurationAbsolute(durationTime).seconds)
  const paramReward: FarmCreateInstructionParamsV6['rewardInfos'][number] = {
    rewardStartTime: toBN(div(getMax(testStartTime || reward.startTime.getTime(), currentBlockChainDate), 1000)),
    rewardEndTime: toBN(div(getMax(testEndTime || reward.endTime.getTime(), currentBlockChainDate), 1000)),
    rewardMint: rewardToken.mint,
    rewardPerSecond: toBN(mul(estimatedValue, padZero(1, rewardToken.decimals))),
    rewardOwnerAccount: rewardTokenAccount.publicKey
  }

  const createFarmInstruction = await Farm.makeFarmCreatorAddRewardTokenInstruction({
    poolKeys: jsonInfo2PoolKeys(farmInfo.jsonInfo),
    owner,
    newRewardInfo: paramReward
  })
  return createFarmInstruction
}
