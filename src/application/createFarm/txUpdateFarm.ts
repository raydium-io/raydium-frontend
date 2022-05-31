import { Farm, jsonInfo2PoolKeys } from '@raydium-io/raydium-sdk'

import assert from '@/functions/assert'

import handleMultiTx, { TxAddOptions } from '@/application/txTools/handleMultiTx'
import { createTransactionCollector } from '@/application/txTools/createTransaction'
import useCreateFarms from './useCreateFarm'
import { parseDurationAbsolute } from '@/functions/date/parseDuration'
import { div } from '@/functions/numberish/operations'
import toBN from '@/functions/numberish/toBN'
import toPubString, { toPub } from '@/functions/format/toMintString'
import useWallet from '../wallet/useWallet'
import { isMintEqual } from '@/functions/judgers/areEqual'
import useFarms from '../farms/useFarms'
import { HydratedFarmInfo } from '../farms/type'
import { UIRewardInfo } from './type'
import { TransactionInstruction } from '@solana/web3.js'

export default async function txUpdateEdited({
  rewardId,
  ...txAddOptions
}: { rewardId: string | number /*  a flag for extract target reward */ } & TxAddOptions) {
  return handleMultiTx(async ({ transactionCollector, baseUtils: { owner, connection } }) => {
    const piecesCollector = createTransactionCollector()

    // ---------- basic info ----------
    const { hydratedInfos } = useFarms.getState()
    const { rewards: uiRewardInfos, farmId: targetFarmId } = useCreateFarms.getState()
    const farmInfo = hydratedInfos.find((f) => toPubString(f.id) === targetFarmId)
    assert(targetFarmId, 'target farm id is missing')
    assert(farmInfo, "can't find target farm")
    const reward = uiRewardInfos.find((r) => r.id === rewardId)
    assert(reward, `can't find target reward`)
    assert(isMintEqual(owner, reward.creator), `reward is not created by walletOwner`)

    // ---------- restart ----------
    const restartRewardInstruction = getRewardRestartInstruction({ reward, farmInfo })
    piecesCollector.addInstruction(restartRewardInstruction)

    transactionCollector.add(await piecesCollector.spawnTransaction(), {
      ...txAddOptions,
      txHistoryInfo: {
        title: '[Dev] Edit Farm'
      }
    })
  })
}

function getRewardRestartInstruction({
  reward,
  farmInfo
}: {
  reward: UIRewardInfo
  farmInfo: HydratedFarmInfo
}): TransactionInstruction {
  const { tokenAccounts } = useWallet.getState()
  const testRestartTime = div(Date.now() + 3000, 1000) // NOTE: test
  const testEndTime = div(Date.now() + 1000 * 60 * 60 * 1.2, 1000) // NOTE: test
  const rewardTokenAccount = tokenAccounts.find((t) => isMintEqual(reward.token?.mint, t.mint))
  assert(rewardTokenAccount?.publicKey, `can't find reward ${reward.token?.symbol}'s tokenAccount`)
  assert(reward.endTime, `reward must have endTime`)
  assert(reward.startTime, `reward must have startTime`)
  assert(reward.amount, `reward must have amount`)
  assert(reward.creator, 'reward must have creator')

  const durationTime = reward.endTime.getTime() - reward.startTime.getTime()
  const perSecond = div(reward.amount, parseDurationAbsolute(durationTime).seconds)

  const createFarmInstruction = Farm.makeRestartFarmInstruction({
    poolKeys: jsonInfo2PoolKeys(farmInfo.jsonInfo),
    rewardVault: toPub(String(reward.id)),
    rewardRestartTime: toBN(testRestartTime).toNumber(),
    rewardEndTime: toBN(testEndTime).toNumber(),
    rewardPerSecond: toBN(perSecond),
    // rewardPerSecond: toBN(mul(perSecond, padZero('1', reward.token?.decimals ?? 6))),
    rewardOwner: toPub(reward.creator),
    rewardOwnerAccount: rewardTokenAccount.publicKey
  })

  assert(createFarmInstruction, 'createFarm valid failed')
  return createFarmInstruction
}
