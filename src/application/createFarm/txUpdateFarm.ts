import { Connection } from '@solana/web3.js'

import { Farm, FarmCreateInstructionParamsV6, FarmRewardInfo } from '@raydium-io/raydium-sdk'

import { createTransactionCollector } from '@/application/txTools/createTransaction'
import txHandler, { SingleTxOption } from '@/application/txTools/handleTx'
import assert from '@/functions/assert'
import asyncMap from '@/functions/asyncMap'
import { setDateTimeSecondToZero } from '@/functions/date/dateFormat'
import { parseDurationAbsolute } from '@/functions/date/parseDuration'
import toPubString from '@/functions/format/toMintString'
import { isMintEqual } from '@/functions/judgers/areEqual'
import { padZero } from '@/functions/numberish/handleZero'
import { div, mul } from '@/functions/numberish/operations'
import toBN from '@/functions/numberish/toBN'

import { HydratedFarmInfo } from '../farms/type'
import useFarms from '../farms/useFarms'
import { isQuantumSOLVersionSOL } from '../token/quantumSOL'
import { SOLMint } from '../token/wellknownToken.config'
import { jsonInfo2PoolKeys } from '../txTools/jsonInfo2PoolKeys'
import useWallet from '../wallet/useWallet'

import { hasRewardBeenEdited } from './parseRewardInfo'
import { UIRewardInfo } from './type'
import useCreateFarms from './useCreateFarm'
import { validateUiRewardInfo } from './validateRewardInfo'

export default async function txUpdateEdited({ ...txAddOptions }: SingleTxOption) {
  return txHandler(async ({ transactionCollector, baseUtils: { owner, connection } }) => {
    const piecesCollector = createTransactionCollector()

    // ---------- generate basic info ----------
    const { hydratedInfos } = useFarms.getState()
    const { rewards: uiRewardInfos, farmId: targetFarmId } = useCreateFarms.getState()

    const farmInfo = hydratedInfos.find((f) => toPubString(f.id) === targetFarmId)
    assert(targetFarmId, 'target farm id is missing')
    assert(farmInfo, "can't find target farm")
    const restartRewards = uiRewardInfos.filter((r) => hasRewardBeenEdited(r) && r.type === 'existed reward')
    const createNewRewards = uiRewardInfos.filter((r) => r.type === 'new added')

    // check input is valid
    const { valid: createNewValid, reason: createNewReason } = validateUiRewardInfo(createNewRewards)
    assert(createNewValid, createNewReason)

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
        description: '(Click to see details)'
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

  assert(reward.token, 'reward must have token')
  assert(reward.endTime, `reward must have endTime`)
  assert(reward.originData?.endTime, `reward's originData must have endTime`)
  assert(reward.startTime, `reward must have startTime`)
  assert(reward.amount, `reward must have amount`)
  assert(reward.owner, 'reward must have creator')

  const startTimestamp = setDateTimeSecondToZero(reward.startTime).getTime()
  const endTimestamp = setDateTimeSecondToZero(reward.endTime).getTime()

  const durationTime = endTimestamp - startTimestamp
  const perSecond = div(reward.amount, parseDurationAbsolute(durationTime).seconds)
  const newRewardInfo: FarmRewardInfo = {
    rewardMint: isQuantumSOLVersionSOL(reward.token) ? SOLMint : reward.token?.mint,
    rewardOpenTime: toBN(div(startTimestamp, 1000)).toNumber(),
    rewardEndTime: toBN(div(endTimestamp, 1000)).toNumber(),
    rewardPerSecond: toBN(mul(perSecond, padZero('1', reward.token?.decimals ?? 6))),
    rewardType: reward.isOptionToken ? 'Option tokens' : 'Standard SPL'
  }
  return Farm.makeRestartFarmInstruction({
    poolKeys: jsonInfo2PoolKeys(farmInfo.jsonInfo),
    connection,
    userKeys: {
      owner,
      tokenAccounts: tokenAccountRawInfos
    },
    newRewardInfo
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
  assert(owner, 'Wallet not connected')
  const rewardToken = reward.token
  assert(reward.startTime, 'reward start time is required')
  assert(reward.endTime, 'reward end time is required')
  assert(reward.amount, 'reward amount is required')
  assert(rewardToken, `can't find selected reward token`)

  const startTimestamp = setDateTimeSecondToZero(reward.startTime).getTime()
  const endTimestamp = setDateTimeSecondToZero(reward.endTime).getTime()

  const durationTime = endTimestamp - startTimestamp
  const estimatedValue = div(reward.amount, parseDurationAbsolute(durationTime).seconds)
  const newRewardInfo: FarmRewardInfo = {
    rewardOpenTime: toBN(div(startTimestamp, 1000)),
    rewardEndTime: toBN(div(endTimestamp, 1000)),
    rewardMint: isQuantumSOLVersionSOL(rewardToken) ? SOLMint : rewardToken.mint, // NOTE: start from RUDY, sol's mint is 11111111111111
    rewardPerSecond: toBN(mul(estimatedValue, padZero(1, rewardToken.decimals))),
    rewardType: reward.isOptionToken ? 'Option tokens' : 'Standard SPL'
  }

  return Farm.makeFarmCreatorAddRewardTokenInstruction({
    poolKeys: jsonInfo2PoolKeys(farmInfo.jsonInfo),
    connection,
    userKeys: {
      owner,
      tokenAccounts: tokenAccountRawInfos
    },
    newRewardInfo: newRewardInfo
  })
}
