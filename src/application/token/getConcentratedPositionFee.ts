import { TOKEN_2022_PROGRAM_ID } from '@solana/spl-token'

import { shakeUndifindedItem, unifyItem } from '@/functions/arrayMethods'
import toPubString from '@/functions/format/toMintString'
import { gte } from '@/functions/numberish/compare'
import { shakeMapEmptyValue } from '@/functions/shakeMapEmptyValue'
import { MayArray } from '@/types/constants'
import { getEpochInfo } from '../clmmMigration/getEpochInfo'
import { getMultiMintInfos } from '../clmmMigration/getMultiMintInfos'
import { UserPositionAccount } from '../concentrated/type'
import { ITransferAmountFee, getTransferFeeInfoSync } from './getTransferFeeInfos'

type FeeInfo = {
  type: 'token' | 'reward'
  feeInfo?: ITransferAmountFee | undefined
}

/**
 * @description in clmm position, get token 2022 fee amount
 * @author Rudy
 */
export async function getConcentratedPositionFee({
  positions: originalPositions
}: // checkMints: forceMints
{
  positions?: MayArray<UserPositionAccount | undefined>
  /** only result checkMint infos */
  // checkMints?: (SplToken | Token | PublicKeyish)[]
}): Promise<Map<UserPositionAccount, FeeInfo[]>> {
  const positions = shakeUndifindedItem([originalPositions].flat())

  if (positions.length === 0) return new Map()
  const checkMints = unifyItem(
    shakeUndifindedItem(
      positions.flatMap((position) =>
        [
          position.tokenFeeAmountA?.token,
          position.tokenFeeAmountB?.token,
          ...position.rewardInfos.map((rewardInfo) => rewardInfo.token)
        ]
          .filter((token) => token?.programId && token.programId.equals(TOKEN_2022_PROGRAM_ID))
          .map((token) => toPubString(token?.mint))
      )
    )
  )
  /** no token is token 2022, so empty checkMints array */
  if (checkMints.length === 0) return new Map()
  const [epochInfo, mintInfos] = await Promise.all([getEpochInfo(), getMultiMintInfos({ mints: checkMints })])
  const infos = shakeMapEmptyValue(
    new Map(
      positions.map((position) => {
        const feeInfos = [
          {
            type: 'token',
            feeInfo:
              position.tokenFeeAmountA &&
              getTransferFeeInfoSync({ amount: position.tokenFeeAmountA, mintInfos, epochInfo })
          },
          {
            type: 'token',
            feeInfo:
              position.tokenFeeAmountB &&
              getTransferFeeInfoSync({ amount: position.tokenFeeAmountB, mintInfos, epochInfo })
          },
          ...position.rewardInfos.map(({ penddingReward: rawAmount }, index) => {
            const rewardInfo = position.ammPool.state.rewardInfos[index]
            return {
              type: `reward`,
              feeInfo:
                rawAmount &&
                getTransferFeeInfoSync({
                  amount: rawAmount,
                  mintInfos,
                  epochInfo
                }),
              rawAmount
            } as const
          })
        ] as const
        const validFeeInfos = feeInfos.filter((i) => gte(i.feeInfo?.fee, 0))

        return [position, validFeeInfos.length ? validFeeInfos : undefined]
      })
    )
  )

  return infos
}
