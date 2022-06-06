import { Farm, jsonInfo2PoolKeys } from '@raydium-io/raydium-sdk'

import assert from '@/functions/assert'

import handleMultiTx, { TxAddOptions } from '@/application/txTools/handleMultiTx'
import { createTransactionCollector } from '@/application/txTools/createTransaction'
import useCreateFarms from './useCreateFarm'
import toPubString, { toPub } from '@/functions/format/toMintString'
import useWallet from '../wallet/useWallet'
import { isMintEqual } from '@/functions/judgers/areEqual'
import useFarms from '../farms/useFarms'
import { HydratedFarmInfo } from '../farms/type'
import { UIRewardInfo } from './type'
import { TransactionInstruction } from '@solana/web3.js'

export default async function txClaimReward({ reward, ...txAddOptions }: { reward: UIRewardInfo } & TxAddOptions) {
  return handleMultiTx(async ({ transactionCollector }) => {
    const piecesCollector = createTransactionCollector()

    // ---------- generate basic info ----------
    const { hydratedInfos } = useFarms.getState()
    const { farmId: targetFarmId } = useCreateFarms.getState()
    assert(targetFarmId, 'target farm id is missing')
    const farmInfo = hydratedInfos.find((f) => toPubString(f.id) === targetFarmId)
    assert(farmInfo, "can't find target farm")

    // ---------- restart ----------
    piecesCollector.addInstruction(createClaimRewardInstruction({ reward, farmInfo }))

    transactionCollector.add(await piecesCollector.spawnTransaction(), {
      ...txAddOptions,
      txHistoryInfo: {
        title: '[Dev] Claim reward'
      }
    })
  })
}

function createClaimRewardInstruction({
  reward,
  farmInfo
}: {
  reward: UIRewardInfo
  farmInfo: HydratedFarmInfo
}): TransactionInstruction {
  const { tokenAccounts, owner } = useWallet.getState()
  assert(owner, `wallet not connected`)
  assert(isMintEqual(owner, reward.owner), `reward is not created by walletOwner`)
  const rewardTokenAccount = tokenAccounts.find((t) => isMintEqual(reward.token?.mint, t.mint))
  assert(rewardTokenAccount?.publicKey, `can't find reward ${reward.token?.symbol}'s tokenAccount`)

  const withdrawFarmInstruction = Farm.makeWithdrawFarmRewardInstruction({
    owner,
    poolKeys: jsonInfo2PoolKeys(farmInfo.jsonInfo),
    rewardVault: toPub(String(reward.id)),
    userVault: rewardTokenAccount.publicKey
  })

  assert(withdrawFarmInstruction, 'withdraw farm valid failed')
  return withdrawFarmInstruction
}
