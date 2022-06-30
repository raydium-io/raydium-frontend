import { Farm, FarmCreateInstructionParamsV6, FarmPoolJsonInfoV6 } from '@raydium-io/raydium-sdk'

import assert from '@/functions/assert'

import { createTransactionCollector } from '@/application/txTools/createTransaction'
import handleMultiTx, { AddSingleTxOptions } from '@/application/txTools/handleMultiTx'
import { setDateTimeSecondToZero } from '@/functions/date/dateFormat'
import { parseDurationAbsolute } from '@/functions/date/parseDuration'
import toPubString, { toPub } from '@/functions/format/toMintString'
import { isMintEqual } from '@/functions/judgers/areEqual'
import { padZero } from '@/functions/numberish/handleZero'
import { div, mul } from '@/functions/numberish/operations'
import toBN from '@/functions/numberish/toBN'
import useWallet from '../wallet/useWallet'
import useCreateFarms from './useCreateFarm'
import { usePools } from '../pools/usePools'
import { EXTEND_BEFORE_END_SECOND, MAX_DURATION_SECOND, MIN_DURATION_SECOND } from '../farms/handleFarmInfo'
import { FarmPoolJsonInfo } from '../farms/type'
import asyncMap from '@/functions/asyncMap'
import { setLocalItem } from '@/functions/dom/jStorage'
import { addItem } from '@/functions/arrayMethods'

export const userCreatedFarmKey = 'USER_CREATED_FARMS'

export default async function txCreateNewFarm(
  { onReceiveFarmId, ...txAddOptions }: AddSingleTxOptions & { onReceiveFarmId?: (farmId: string) => void },
  txKey?: string
) {
  return handleMultiTx(
    async ({ transactionCollector, baseUtils: { owner, connection } }) => {
      const { tokenAccountRawInfos } = useWallet.getState() // TODO: should add tokenAccountRawInfos to `handleMultiTx()`'s baseUtils
      const { rewards: uiRewardInfos } = useCreateFarms.getState()
      const { tokenAccounts } = useWallet.getState()
      const piecesCollector = createTransactionCollector()
      const { poolId } = useCreateFarms.getState()
      const { jsonInfos } = usePools.getState()
      const poolJsonInfo = jsonInfos.find((j) => j.ammId === poolId)
      if (!poolJsonInfo) return
      const rewards: FarmCreateInstructionParamsV6['rewardInfos'] = uiRewardInfos.map((reward) => {
        const rewardToken = reward.token
        assert(reward.startTime, 'reward start time is required')
        assert(reward.endTime, 'reward end time is required')
        assert(reward.amount, 'reward amount is required')
        assert(rewardToken, `can't find selected reward token`)
        const startTimestamp = setDateTimeSecondToZero(reward.startTime).getTime()
        const endTimestamp = setDateTimeSecondToZero(reward.endTime).getTime()
        const durationTime = endTimestamp - startTimestamp
        const estimatedValue = div(reward.amount, parseDurationAbsolute(durationTime).seconds)
        const perSecondReward = toBN(mul(estimatedValue, padZero(1, rewardToken.decimals)))
        return {
          rewardOpenTime: toBN(div(startTimestamp, 1000)),
          rewardEndTime: toBN(div(endTimestamp, 1000)),
          rewardMint: rewardToken.mint,
          rewardPerSecond: perSecondReward
        }
      })
      const lockMint = '7WVMpKPcpDp6ezRp5uw4R1MZchQkDuFGaudCa87MA1aR' // NOTE: test
      const lockVault = 'H2StJuXebaAnSQHvbYGeokbgC1EKB6tBvY2iB2PxoUqS' // NOTE: test
      const lpMint = poolJsonInfo.lpMint
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
      const createdFarmId = toPubString(createFarmInstruction.newAccounts[0].publicKey)
      onReceiveFarmId?.(createdFarmId)

      // should record result
      async function recordNewCreatedFarmItem() {
        const { poolId, farmId } = useCreateFarms.getState()
        const { jsonInfos } = usePools.getState()
        if (!poolId) return
        if (!farmId) return
        const poolJsonInfo = jsonInfos.find((j) => j.ammId === poolId)
        if (!poolJsonInfo) return
        const version = 6
        const lpMint = 'G54x5tuRV12WyNkSjfNnq3jyzfcPF9EgB8c9jTzsQKVW' // NOTE: test
        // const lpMint = poolJsonInfo.lpMint
        const programId = Farm.getProgramId(6)
        const authority = toPubString(
          (await Farm.getAssociatedAuthority({ programId, poolId: toPub(poolId) })).publicKey
        )
        const lpVault = toPubString(
          await Farm.getAssociatedLedgerPoolAccount({
            programId,
            poolId: toPub(farmId),
            mint: toPub(lpMint),
            type: 'lpVault'
          })
        )

        const farmItem = {
          id: farmId,
          lpMint,
          version,
          programId: toPubString(programId),
          authority,
          lpVault,
          rewardPeriodMax: MAX_DURATION_SECOND,
          rewardPeriodMin: MIN_DURATION_SECOND,
          rewardPeriodExtend: EXTEND_BEFORE_END_SECOND,
          upcoming: true,
          creator: toPubString(owner),
          rewardInfos: await asyncMap(rewards, async (reward) => {
            const rewardVault = toPubString(
              await Farm.getAssociatedLedgerPoolAccount({
                programId,
                poolId: toPub(poolId),
                mint: toPub(reward.rewardMint),
                type: 'rewardVault'
              })
            )
            return {
              ...reward,
              rewardMint: toPubString(reward.rewardMint),
              rewardOpenTime: toBN(reward.rewardOpenTime).toNumber(),
              rewardEndTime: toBN(reward.rewardEndTime).toNumber(),
              rewardPerSecond: toBN(reward.rewardPerSecond).toNumber(),
              rewardVault,
              rewardSender: toPubString(owner)
            }
          })
        } as FarmPoolJsonInfo
        setLocalItem<FarmPoolJsonInfo[]>(userCreatedFarmKey, (s) => addItem(s ?? [], farmItem))
      }

      assert(createFarmInstruction, 'createFarm valid failed')
      piecesCollector.addInstruction(...createFarmInstruction.instructions)
      piecesCollector.addSigner(...createFarmInstruction.newAccounts)
      transactionCollector.add(await piecesCollector.spawnTransaction(), {
        ...txAddOptions,
        txHistoryInfo: {
          title: 'Create new Farm',
          description: `farmId: ${createdFarmId.slice(0, 4)}...${createdFarmId.slice(-4)}`
        },
        onTxSuccess(...args) {
          recordNewCreatedFarmItem() // test
          txAddOptions.onTxSuccess?.(...args)
        }
      })
    },
    { txKey: txKey }
  )
}
