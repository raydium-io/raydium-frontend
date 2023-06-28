import { shakeUndifindedItem, unifyItem } from '@/functions/arrayMethods'
import toPubString from '@/functions/format/toMintString'
import { MayArray } from '@/types/constants'
import { ZERO, getTransferAmountFee } from '@raydium-io/raydium-sdk'
import { TOKEN_2022_PROGRAM_ID } from '@solana/spl-token'
import { getEpochInfo } from '../clmmMigration/getEpochInfo'
import { getMultiMintInfos } from '../clmmMigration/getMultiMintInfos'
import { HydratedConcentratedInfo, SDKParsedConcentratedInfo } from '../concentrated/type'

/**
 * @description in clmm position, get token 2022 fee amount
 */
export async function getConcentratedPositionFee({
  currentAmmPool
}: {
  currentAmmPool: MayArray<SDKParsedConcentratedInfo | undefined>
}) {
  const epochInfo = await getEpochInfo()
  const ammPools = shakeUndifindedItem([currentAmmPool].flat())

  if (ammPools.length === 0) return []
  const checkMints = unifyItem(
    ammPools
      .filter((ammPool) =>
        ammPool.positionAccount?.find(
          (position) =>
            position.tokenFeeAmountA.gt(ZERO) ||
            position.tokenFeeAmountB.gt(ZERO) ||
            position.rewardInfos.filter((iii) => iii.pendingReward.gt(ZERO))
        )
      )
      .flatMap((ammPool) =>
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
  if (checkMints.length === 0) return []
  const mintInfos = await getMultiMintInfos({
    mints: ['45bLAX9u3VVXddYmRCpELhGqbRoZrGmhSmxEDZy3pJAi', '6M4t1GyLdisCsX3X5A9zqABRBPkLPYxEeNb33eURtq9c']
  })
  const showInfos = ammPools
    .filter((ammPool) =>
      ammPool.positionAccount?.find(
        (position) =>
          position.tokenFeeAmountA.gt(ZERO) ||
          position.tokenFeeAmountB.gt(ZERO) ||
          position.rewardInfos.filter((rewardInfo) => rewardInfo.pendingReward.gt(ZERO))
      )
    )
    .map((ammPool) => ({
      id: ammPool.state.id,
      positionAmountChange: ammPool.positionAccount?.map((position) =>
        [
          {
            type: 'tokenFeeA',
            transformAmountFee: getTransferAmountFee(
              position.tokenFeeAmountA,
              mintInfos[ammPool.state.mintA.mint.toString()].feeConfig,
              epochInfo,
              false
            )
          },
          {
            type: 'tokenFeeB',
            transformAmountFee: getTransferAmountFee(
              position.tokenFeeAmountB,
              mintInfos[ammPool.state.mintB.mint.toString()].feeConfig,
              epochInfo,
              false
            )
          },
          ...ammPool.state.rewardInfos.map((rewardInfo, index) => ({
            type: 'reward',
            transformAmountFee: getTransferAmountFee(
              position.rewardInfos[index].pendingReward,
              mintInfos[rewardInfo.tokenMint.toString()].feeConfig,
              epochInfo,
              false
            )
          }))
        ].filter((i) => i.transformAmountFee.amount.gt(ZERO))
      )
    }))
  return showInfos
}
