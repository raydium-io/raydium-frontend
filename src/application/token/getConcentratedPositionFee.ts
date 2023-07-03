import { ZERO } from '@raydium-io/raydium-sdk'
import { TOKEN_2022_PROGRAM_ID } from '@solana/spl-token'

import { shakeUndifindedItem, unifyItem } from '@/functions/arrayMethods'
import toPubString from '@/functions/format/toMintString'
import { gte } from '@/functions/numberish/compare'
import { shakeMapEmptyValue } from '@/functions/shakeMapEmptyValue'
import { MayArray } from '@/types/constants'
import { getEpochInfo } from '../clmmMigration/getEpochInfo'
import { getMultiMintInfos } from '../clmmMigration/getMultiMintInfos'
import { HydratedConcentratedInfo, UserPositionAccount } from '../concentrated/type'
import { ITransferAmountFee, getTransferFeeInfosSync } from './getTransferFeeInfos'

type FeeInfo = {
  type: string
  feeInfo?: ITransferAmountFee | undefined
}

/**
 * @description in clmm position, get token 2022 fee amount
 * @author Rudy
 */
export async function getConcentratedPositionFee({
  ammPool: originalAmmPools,
  checkPositions
}: // checkMints: forceMints
{
  ammPool: MayArray<HydratedConcentratedInfo | undefined>
  // TODO
  checkPositions?: MayArray<UserPositionAccount | undefined>
  /** only result checkMint infos */
  // checkMints?: (SplToken | Token | PublicKeyish)[]
}): Promise<Map<HydratedConcentratedInfo, Map<UserPositionAccount, FeeInfo[]>>> {
  const ammPools = shakeUndifindedItem([originalAmmPools].flat()).filter((ammPool) =>
    ammPool.positionAccount?.find(
      (position) =>
        position.tokenFeeAmountA.gt(ZERO) ||
        position.tokenFeeAmountB.gt(ZERO) ||
        position.rewardInfos.filter((rewardInfo) => rewardInfo.pendingReward.gt(ZERO))
    )
  )

  if (ammPools.length === 0) return new Map()
  const checkMints =
    // forceMints?.map((i) => toPubString(isObject(i) && 'mint' in i ? i.mint : i)) ??
    unifyItem(
      ammPools.flatMap((ammPool) =>
        [
          ammPool.state.mintA,
          ammPool.state.mintB,
          ...ammPool.state.rewardInfos.map((rewardInfo) => ({
            mint: rewardInfo.tokenMint,
            programId: rewardInfo.tokenProgramId
          }))
        ]
          .filter(({ programId }) => programId.equals(TOKEN_2022_PROGRAM_ID))
          .map(({ mint }) => toPubString(mint))
      )
    )
  /** no token is token 2022, so empty checkMints array */
  if (checkMints.length === 0) return new Map()
  const [epochInfo, mintInfos] = await Promise.all([getEpochInfo(), getMultiMintInfos({ mints: checkMints })])
  const infos = shakeMapEmptyValue(
    new Map(
      ammPools.map((ammPool) => [
        ammPool,
        shakeMapEmptyValue(
          new Map(
            (ammPool.userPositionAccount ?? []).map((position) => {
              const feeInfos = [
                {
                  type: 'TokenFeeA',
                  feeInfo:
                    position.tokenFeeAmountA &&
                    getTransferFeeInfosSync({ amount: position.tokenFeeAmountA, mintInfos, epochInfo })
                },
                {
                  type: 'TokenFeeB',
                  feeInfo:
                    position.tokenFeeAmountB &&
                    getTransferFeeInfosSync({ amount: position.tokenFeeAmountB, mintInfos, epochInfo })
                },
                ...ammPool.state.rewardInfos.map((rewardInfo, index) => {
                  const rawAmount = position.rewardInfos[index].penddingReward
                  return {
                    type: `Reward ${rawAmount?.token.symbol}`,
                    feeInfo:
                      rawAmount &&
                      getTransferFeeInfosSync({
                        amount: rawAmount,
                        mintInfos,
                        epochInfo
                      }),
                    rawAmount
                  }
                })
              ]
              return [position, feeInfos.filter((i) => gte(i.feeInfo?.fee, 0))]
            })
          )
        )
      ])
    )
  )

  return infos
}
