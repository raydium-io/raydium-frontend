import { Farm, FarmCreateInstructionParamsV6, jsonInfo2PoolKeys } from '@raydium-io/raydium-sdk'

import assert from '@/functions/assert'

import handleMultiTx, { TxAddOptions } from '@/application/txTools/handleMultiTx'
import { createTransactionCollector } from '@/application/txTools/createTransaction'
import useCreateFarms from './useCreateFarm'
import { parseDurationAbsolute } from '@/functions/date/parseDuration'
import { div, mul } from '@/functions/numberish/operations'
import toBN from '@/functions/numberish/toBN'
import toPubString, { toPub } from '@/functions/format/toMintString'
import useWallet from '../wallet/useWallet'
import { isMintEqual } from '@/functions/judgers/areEqual'
import { padZero } from '@/functions/numberish/handleZero'
import useFarms from '../farms/useFarms'
import { HydratedFarmInfo, HydratedRewardInfo } from '../farms/type'

export default async function txUpdateEdited({
  rewardId,
  ...txAddOptions
}: { rewardId: string | number /*  a flag for extract target reward */ } & TxAddOptions) {
  return handleMultiTx(async ({ transactionCollector, baseUtils: { owner, connection } }) => {
    const piecesCollector = createTransactionCollector()
    const { rewards: uiRewardInfos, farmId: targetFarmId } = useCreateFarms.getState()
    const reward = uiRewardInfos.find((r) => r.id === rewardId)
    assert(reward, `can't find target reward`)
    const { tokenAccounts } = useWallet.getState()
    const testRestartTime = toBN(div(Date.now() + 3000, 1000)) // NOTE: test
    const testEndTime = toBN(div(Date.now() + 1000 * 60 * 60 * 1.2, 1000)) // NOTE: test
    const rewardTokenAccount = tokenAccounts.find((t) => isMintEqual(reward.token?.mint, t.mint))
    assert(rewardTokenAccount?.publicKey, `can't find reward ${reward.token?.symbol}'s tokenAccount`)
    assert(reward.endTime, `reward must have endTime`)
    assert(reward.startTime, `reward must have startTime`)
    assert(reward.amount, `reward must have amount`)

    const durationTime = reward.endTime.getTime() - reward.startTime.getTime()
    const perSecond = div(reward.amount, parseDurationAbsolute(durationTime).seconds)

    const { hydratedInfos } = useFarms.getState()
    const farmInfo = hydratedInfos.find((f) => toPubString(f.id) === targetFarmId)

    assert(targetFarmId, 'target farm id is missing')
    assert(farmInfo, "can't find target farm")

    const createFarmInstruction = Farm.makeRestartFarmInstruction({
      poolKeys: jsonInfo2PoolKeys(farmInfo.jsonInfo),
      rewardVault: toPub(String(reward.id)),
      rewardRestartTime: testRestartTime.toNumber(),
      rewardEndTime: testEndTime.toNumber(),
      rewardPerSecond: toBN(mul(perSecond, padZero('1', reward.token?.decimals ?? 6))),
      rewardOwner: owner,
      rewardOwnerAccount: rewardTokenAccount.publicKey
    })

    assert(createFarmInstruction, 'createFarm valid failed')
    piecesCollector.addInstruction(createFarmInstruction)
    transactionCollector.add(await piecesCollector.spawnTransaction(), {
      ...txAddOptions,
      txHistoryInfo: {
        title: '[Dev] Edit Farm'
      }
    })
  })
}
