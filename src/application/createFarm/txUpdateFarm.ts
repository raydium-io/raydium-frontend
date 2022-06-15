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
import { Connection, TransactionInstruction } from '@solana/web3.js'
import { hasRewardBeenEdited } from './parseRewardInfo'
import { padZero } from '@/functions/numberish/handleZero'
import asyncMap from '@/functions/asyncMap'
import useConnection from '../connection/useConnection'
import { offsetDateTime } from '@/functions/date/dateFormat'
import { toHumanReadable } from '@/functions/format/toHumanReadable'
import { toTokenAmount } from '@/functions/format/toTokenAmount'
import { SOLMint } from '../token/wellknownToken.config'
import { isQuantumSOLVersionSOL } from '../token/quantumSOL'

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
    await asyncMap(restartRewards, async (r) => {
      const { instructions, newAccounts } = await createRewardRestartInstruction({ reward: r, farmInfo, connection })
      piecesCollector.addInstruction(...instructions)
      piecesCollector.addSigner(...newAccounts)
    })

    // ---------- create new ----------
    await asyncMap(createNewRewards, async (r) => {
      const { instructions, newAccounts } = await createNewRewardInstruction({ reward: r, farmInfo, connection })
      piecesCollector.addInstruction(...instructions)
      piecesCollector.addSigner(...newAccounts)
    })

    transactionCollector.add(await piecesCollector.spawnTransaction(), {
      ...txAddOptions,
      txHistoryInfo: {
        title: 'Edit Farm',
        description: '(click to see details)'
      }
    })
  })
}

async function createRewardRestartInstruction({
  connection,
  reward,
  farmInfo
}: {
  connection: Connection
  reward: UIRewardInfo
  farmInfo: HydratedFarmInfo
}) {
  const { owner, tokenAccountRawInfos } = useWallet.getState()
  assert(owner && isMintEqual(owner, reward.owner), `reward is not created by walletOwner`)

  const { chainTimeOffset = 0 } = useConnection.getState()
  const currentBlockChainDate = offsetDateTime(Date.now() + chainTimeOffset, { minutes: 0 /* force */ }).getTime()

  const testRestartTime = Date.now() // NOTE: test
  const testEndTime = Date.now() + 1000 * 60 * 60 * 1.2 // NOTE: test

  assert(reward.token, 'reward must have token')
  assert(reward.endTime, `reward must have endTime`)
  assert(reward.startTime, `reward must have startTime`)
  assert(reward.amount, `reward must have amount`)
  assert(reward.owner, 'reward must have creator')
  const durationTime = reward.endTime.getTime() - reward.startTime.getTime()
  const perSecond = div(reward.amount, parseDurationAbsolute(durationTime).seconds)

  return Farm.makeRestartFarmInstruction({
    poolKeys: jsonInfo2PoolKeys(farmInfo.jsonInfo),
    connection,
    userKeys: {
      owner,
      tokenAccounts: tokenAccountRawInfos
    },
    newRewardInfo: {
      rewardMint: isQuantumSOLVersionSOL(reward.token) ? SOLMint : reward.token?.mint,
      rewardOpenTime: toBN(div(getMax(reward.startTime.getTime(), currentBlockChainDate), 1000)).toNumber(),
      rewardEndTime: toBN(div(getMax(reward.endTime.getTime(), currentBlockChainDate), 1000)).toNumber(),
      rewardPerSecond: toBN(mul(perSecond, padZero('1', reward.token?.decimals ?? 6)))
    }
  })
}

function createNewRewardInstruction({
  connection,
  reward,
  farmInfo
}: {
  connection: Connection
  reward: UIRewardInfo
  farmInfo: HydratedFarmInfo
}) {
  const { owner, tokenAccountRawInfos } = useWallet.getState()

  const { chainTimeOffset = 0 } = useConnection.getState()
  const currentBlockChainDate = offsetDateTime(Date.now() + chainTimeOffset, { minutes: 0 /* force */ }).getTime()

  const testStartTime = Date.now() // NOTE: test
  const testEndTime = Date.now() + 1000 * 60 * 60 * 1.5 // NOTE: test

  assert(owner, 'wallet not connected')
  const rewardToken = reward.token
  assert(reward.startTime, 'reward start time is required')
  assert(reward.endTime, 'reward end time is required')
  assert(reward.amount, 'reward amount is required')
  assert(rewardToken, `can't find selected reward token`)
  const durationTime = reward.endTime.getTime() - reward.startTime.getTime()
  const estimatedValue = div(reward.amount, parseDurationAbsolute(durationTime).seconds)
  const paramReward: FarmCreateInstructionParamsV6['rewardInfos'][number] = {
    rewardOpenTime: toBN(div(getMax(reward.startTime.getTime(), currentBlockChainDate), 1000)),
    rewardEndTime: toBN(div(getMax(reward.endTime.getTime(), currentBlockChainDate), 1000)),
    rewardMint: rewardToken.mint,
    rewardPerSecond: toBN(mul(estimatedValue, padZero(1, rewardToken.decimals)))
  }

  return Farm.makeFarmCreatorAddRewardTokenInstruction({
    poolKeys: jsonInfo2PoolKeys(farmInfo.jsonInfo),
    connection,
    userKeys: {
      owner,
      tokenAccounts: tokenAccountRawInfos
    },
    newRewardInfo: paramReward
  })
}
