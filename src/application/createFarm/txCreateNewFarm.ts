import { Farm, FarmCreateInstructionParamsV6, FarmPoolJsonInfoV6 } from '@raydium-io/raydium-sdk'

import { createTransactionCollector } from '@/application/txTools/createTransaction'
import txHandler, { SingleTxOption } from '@/application/txTools/handleTx'
import { addItem } from '@/functions/arrayMethods'
import assert from '@/functions/assert'
import asyncMap from '@/functions/asyncMap'
import { setDateTimeSecondToZero } from '@/functions/date/dateFormat'
import { parseDurationAbsolute } from '@/functions/date/parseDuration'
import { setLocalItem } from '@/functions/dom/jStorage'
import toPubString, { toPub } from '@/functions/format/toMintString'
import { isMintEqual } from '@/functions/judgers/areEqual'
import { padZero } from '@/functions/numberish/handleZero'
import { div, mul } from '@/functions/numberish/operations'
import toBN from '@/functions/numberish/toBN'

import { EXTEND_BEFORE_END_SECOND, MAX_DURATION_SECOND, MIN_DURATION_SECOND } from '../farms/handleFarmInfo'
import { FarmPoolJsonInfo } from '../farms/type'
import useLiquidity from '../liquidity/useLiquidity'
import { usePools } from '../pools/usePools'
import { WSOLMint } from '../token/quantumSOL'
import { RAYMint, SOLMint } from '../token/wellknownToken.config'
import useWallet from '../wallet/useWallet'

import useCreateFarms from './useCreateFarm'
import { validate300Ray, validateUiRewardInfo } from './validateRewardInfo'
import { SDK_PROGRAM_IDS } from '../token/wellknownProgram.config'

export const userCreatedFarmKey = 'USER_CREATED_FARMS'

export default async function txCreateNewFarm({
  onReceiveFarmId,
  ...txAddOptions
}: SingleTxOption & { onReceiveFarmId?: (farmId: string) => void }) {
  return txHandler(async ({ transactionCollector, baseUtils: { owner, connection } }) => {
    const { rewards: uiRewardInfos } = useCreateFarms.getState()

    // check input is valid
    const { valid: have300Ray, reason: have300RayValidText } = validate300Ray()
    assert(have300Ray, have300RayValidText)
    const { valid, reason } = validateUiRewardInfo(uiRewardInfos)
    assert(valid, reason)

    const { tokenAccounts, tokenAccountRawInfos } = useWallet.getState()
    const piecesCollector = createTransactionCollector()
    const { poolId } = useCreateFarms.getState()
    const { jsonInfos } = useLiquidity.getState()
    const poolJsonInfo = jsonInfos.find((j) => j.id === poolId)

    const tokenAccountMints = tokenAccounts.map((ta) => toPubString(ta.mint))
    assert(poolJsonInfo, 'pool json info not founded')
    const rewards: FarmCreateInstructionParamsV6['rewardInfos'] = uiRewardInfos.map((reward) => {
      const rewardToken = reward.token
      assert(reward.startTime, 'reward start time is required')
      assert(reward.endTime, 'reward end time is required')
      assert(reward.amount, 'reward amount is required')
      if (!isMintEqual(reward.token?.mint, WSOLMint)) {
        const userHaveToken = tokenAccountMints.includes(toPubString(reward.token?.mint))
        assert(userHaveToken, "token not existed in user's wallet")
      }
      assert(rewardToken, `can't find selected reward token`)
      const startTimestamp = setDateTimeSecondToZero(reward.startTime).getTime()
      const endTimestamp = setDateTimeSecondToZero(reward.endTime).getTime()
      const durationTime = endTimestamp - startTimestamp
      const estimatedValue = div(reward.amount, parseDurationAbsolute(durationTime).seconds)
      const perSecondReward = toBN(mul(estimatedValue, padZero(1, rewardToken.decimals)))
      return {
        rewardOpenTime: toBN(div(startTimestamp, 1000)),
        rewardEndTime: toBN(div(endTimestamp, 1000)),
        rewardMint: rewardToken.id === 'sol' ? SOLMint : rewardToken.mint, // NOTE: start from RUDY, sol's mint is 11111111111111
        rewardPerSecond: perSecondReward,
        rewardType: reward.isOptionToken ? 'Option tokens' : 'Standard SPL'
      }
    })
    const lockMint = '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R' // NOTE: Force at 2022-07-06, haven't tell why, just force it
    const lockVault = 'FrspKwj8i3pNmKwXreTveC4fu7KL5ZbGeXdZBe2XViu1' // NOTE: Force at 2022-07-06, haven't tell why, just force it
    const lpMint = poolJsonInfo.lpMint
    const lockMintTokenAccount = tokenAccounts.find((t) => isMintEqual(t.mint, lockMint))
    assert(lockMintTokenAccount?.publicKey, 'lockMintTokenAccount not found')
    const { innerTransaction: createFarmInnerTransaction, address } = await Farm.makeCreateFarmInstruction({
      poolInfo: {
        lpMint: toPub(lpMint),
        lockInfo: {
          lockMint: toPub(lockMint),
          lockVault: toPub(lockVault)
        },
        version: 6,
        rewardInfos: rewards,
        programId: SDK_PROGRAM_IDS.FarmV6
      },
      connection,
      userKeys: {
        owner,
        tokenAccounts: tokenAccountRawInfos
      }
    })
    const SDKFarmTempAddressKey = 'hello world' // FIXME
    const createdFarmId = toPubString(address[SDKFarmTempAddressKey])
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
      const lpMint = poolJsonInfo.lpMint
      const programId = SDK_PROGRAM_IDS.FarmV6
      const authority = toPubString((await Farm.getAssociatedAuthority({ programId, poolId: toPub(poolId) })).publicKey)
      const lpVault = toPubString(
        Farm.getAssociatedLedgerPoolAccount({
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
            rewardMint: toPubString(reward.rewardMint),
            rewardOpenTime: toBN(reward.rewardOpenTime).toNumber(),
            rewardEndTime: toBN(reward.rewardEndTime).toNumber(),
            rewardPerSecond: toBN(reward.rewardPerSecond).toNumber(),
            rewardVault,
            rewardType: reward.rewardType
          }
        })
      } as FarmPoolJsonInfo
      setLocalItem<FarmPoolJsonInfo[]>(userCreatedFarmKey, (s) => addItem(s ?? [], farmItem))
    }

    assert(createFarmInnerTransaction, 'createFarm valid failed')
    transactionCollector.add(createFarmInnerTransaction, {
      ...txAddOptions,
      cacheTransaction: true,
      txHistoryInfo: {
        title: 'Create New Farm',
        description: `Farm ID: ${createdFarmId.slice(0, 4)}...${createdFarmId.slice(-4)}`
      },
      onTxSuccess(...args) {
        recordNewCreatedFarmItem() // test
        txAddOptions.onTxSuccess?.(...args)
      }
    })
  })
}
