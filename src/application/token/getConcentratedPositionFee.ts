import { shakeUndifindedItem, unifyItem } from '@/functions/arrayMethods'
import toPubString from '@/functions/format/toMintString'
import { toTokenAmount } from '@/functions/format/toTokenAmount'
import { MayArray } from '@/types/constants'
import { ZERO } from '@raydium-io/raydium-sdk'
import { TOKEN_2022_PROGRAM_ID } from '@solana/spl-token'
import { SDKParsedConcentratedInfo } from '../concentrated/type'
import { ITransferAmountFee, getTransferFeeInfos } from './getTransferFeeInfos'
import useToken from './useToken'

type PoolId = string
type PositionId = string
/**
 * @description in clmm position, get token 2022 fee amount
 */
export async function getConcentratedPositionFee({
  currentAmmPool
}: {
  currentAmmPool: MayArray<SDKParsedConcentratedInfo | undefined>
}): Promise<
  Record<
    PoolId,
    Record<
      PositionId,
      {
        type: string
        feeInfo: Promise<ITransferAmountFee> | undefined
      }[]
    >
  >
> {
  const { getToken } = useToken.getState()
  const ammPools = shakeUndifindedItem([currentAmmPool].flat())

  if (ammPools.length === 0) return {}
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
  if (checkMints.length === 0) return {}
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
      poolId: toPubString(ammPool.state.id),
      positionAmountChange: Object.fromEntries(
        (ammPool.positionAccount ?? []).map((position) => {
          const tokenA = getToken(ammPool.state.mintA.mint)
          const tokenB = getToken(ammPool.state.mintB.mint)
          const tokenFeeARawAmount = tokenA && toTokenAmount(tokenA, position.tokenFeeAmountA)
          const tokenFeeBRawAmount = tokenB && toTokenAmount(tokenB, position.tokenFeeAmountB)
          return [
            toPubString(position.nftMint),
            [
              {
                type: 'tokenFeeA',
                feeInfo: tokenFeeARawAmount && getTransferFeeInfos({ amount: tokenFeeARawAmount })
              },
              {
                type: 'tokenFeeB',
                feeInfo: tokenFeeBRawAmount && getTransferFeeInfos({ amount: tokenFeeBRawAmount })
              },
              ...ammPool.state.rewardInfos.map((rewardInfo, index) => {
                const rewardToken = getToken(rewardInfo.tokenMint)
                const rawAmount = rewardToken && toTokenAmount(rewardToken, position.rewardInfos[index].pendingReward)
                return {
                  type: 'reward',
                  feeInfo:
                    rawAmount &&
                    getTransferFeeInfos({
                      amount: rawAmount
                    }),
                  rawAmount
                }
              })
            ]
          ]
        })
      )
    }))
  const infos = Object.fromEntries(showInfos.map((info) => [info.poolId, info.positionAmountChange]))
  return infos
}
