// const connection = new Connection('')
//   const ep = await connection.getEpochInfo()

import { PublicKeyish } from '@/types/constants'
import { AmmV3, ZERO, fetchMultipleMintInfos, getTransferAmountFee } from '@raydium-io/raydium-sdk'
import { TOKEN_2022_PROGRAM_ID } from '@solana/spl-token'
import { Connection, EpochInfo } from '@solana/web3.js'

/**
 * @description in clmm position, get token 2022 fee amount
 * @todo not use yet!!!
 */
async function getPositionFee({
  connection,
  epochInfo,
  mints
}: {
  connection: Connection
  epochInfo: EpochInfo
  mints: PublicKeyish[]
}) {
  const listInfo = await AmmV3.fetchMultiplePoolInfos({
    connection,
    poolKeys: [],
    ownerInfo: undefined,
    chainTime: 123,
    batchRequest: true
  })
  const checkMint = Object.values(listInfo)
    .filter(
      (i) =>
        i.positionAccount?.find(
          (ii) =>
            ii.tokenFeeAmountA.gt(ZERO) ||
            (ii.tokenFeeAmountB.gt(ZERO) && ii.rewardInfos.filter((iii) => iii.pendingReward.gt(ZERO)))
        ) && i.state.rewardInfos.filter((ii) => ii.tokenProgramId.equals(TOKEN_2022_PROGRAM_ID))
    )
    .map((i) =>
      [
        i.state.mintA,
        i.state.mintB,
        ...i.state.rewardInfos.map((ii) => ({ mint: ii.tokenMint, programId: ii.tokenProgramId }))
      ].filter((ii) => ii.programId.equals(TOKEN_2022_PROGRAM_ID))
    )
    .flat()
    .map((i) => i.mint)
  const mintInfos = await fetchMultipleMintInfos({ connection, mints: checkMint })
  const showInfos = Object.values(listInfo)
    .filter(
      (i) =>
        i.positionAccount?.find(
          (ii) =>
            ii.tokenFeeAmountA.gt(ZERO) ||
            (ii.tokenFeeAmountB.gt(ZERO) && ii.rewardInfos.filter((iii) => iii.pendingReward.gt(ZERO)))
        ) && i.state.rewardInfos.filter((ii) => ii.tokenProgramId.equals(TOKEN_2022_PROGRAM_ID))
    )
    .map((i) => ({
      id: i.state.id,
      positionAmountChange: i.positionAccount?.map((ii) =>
        [
          {
            type: 'tokenFeeA',
            amount: getTransferAmountFee(
              ii.tokenFeeAmountA,
              mintInfos[i.state.mintA.mint.toString()].feeConfig,
              epochInfo,
              false
            )
          },
          {
            type: 'tokenFeeB',
            amount: getTransferAmountFee(
              ii.tokenFeeAmountB,
              mintInfos[i.state.mintB.mint.toString()].feeConfig,
              epochInfo,
              false
            )
          },
          ...i.state.rewardInfos.map((iii, index) => ({
            type: 'reward',
            amount: getTransferAmountFee(
              ii.rewardInfos[index].pendingReward,
              mintInfos[iii.tokenMint.toString()].feeConfig,
              epochInfo,
              false
            )
          }))
        ].filter((ii) => ii.amount.amount.gt(ZERO))
      )
    }))
  return showInfos
}
