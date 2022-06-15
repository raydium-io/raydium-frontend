import { Farm, jsonInfo2PoolKeys } from '@raydium-io/raydium-sdk'
import { Connection, Signer, TransactionInstruction } from '@solana/web3.js'

import { createTransactionCollector } from '@/application/txTools/createTransaction'
import handleMultiTx, { TxAddOptions } from '@/application/txTools/handleMultiTx'
import assert from '@/functions/assert'
import toPubString from '@/functions/format/toMintString'
import { isMintEqual } from '@/functions/judgers/areEqual'
import { HydratedFarmInfo } from '../farms/type'
import useFarms from '../farms/useFarms'
import { isQuantumSOLVersionSOL } from '../token/quantumSOL'
import { SOLMint } from '../token/wellknownToken.config'
import useWallet from '../wallet/useWallet'
import { UIRewardInfo } from './type'
import useCreateFarms from './useCreateFarm'

export default async function txClaimReward({ reward, ...txAddOptions }: { reward: UIRewardInfo } & TxAddOptions) {
  return handleMultiTx(async ({ transactionCollector, baseUtils: { connection } }) => {
    const piecesCollector = createTransactionCollector()

    // ---------- generate basic info ----------
    const { hydratedInfos } = useFarms.getState()
    const { farmId: targetFarmId } = useCreateFarms.getState()
    assert(targetFarmId, 'target farm id is missing')
    const farmInfo = hydratedInfos.find((f) => toPubString(f.id) === targetFarmId)
    assert(farmInfo, "can't find target farm")

    // ---------- restart ----------
    const { instructions, newAccounts } = await createClaimRewardInstruction({ reward, farmInfo, connection })
    piecesCollector.addInstruction(...instructions)
    piecesCollector.addSigner(...newAccounts)

    transactionCollector.add(await piecesCollector.spawnTransaction(), {
      ...txAddOptions,
      txHistoryInfo: {
        title: 'Claim reward',
        description: '(click to see details)'
      }
    })
  })
}

async function createClaimRewardInstruction({
  connection,
  reward,
  farmInfo
}: {
  connection: Connection
  reward: UIRewardInfo
  farmInfo: HydratedFarmInfo
}): Promise<{
  newAccounts: Signer[]
  instructions: TransactionInstruction[]
}> {
  const { owner, tokenAccountRawInfos } = useWallet.getState()
  assert(owner, `wallet not connected`)
  assert(isMintEqual(owner, reward.owner), `reward is not created by walletOwner`)
  assert(reward.token, `reward token haven't set`)

  const withdrawFarmInstruction = Farm.makeCreatorWithdrawFarmRewardInstruction({
    connection,
    poolKeys: jsonInfo2PoolKeys(farmInfo.jsonInfo),
    userKeys: {
      tokenAccounts: tokenAccountRawInfos,
      owner
    },
    withdrawMint: isQuantumSOLVersionSOL(reward.token) ? SOLMint : reward.token?.mint
  })

  assert(withdrawFarmInstruction, 'withdraw farm valid failed')
  return withdrawFarmInstruction
}
