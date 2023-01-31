import { toTokenAmount } from '@/functions/format/toTokenAmount'
import { isPubEqual } from '@/functions/judgers/areEqual'
import { mul } from '@/functions/numberish/operations'
import { SHOW_INFO } from '@raydium-io/raydium-sdk'
import useLiquidity from '../liquidity/useLiquidity'
import useToken from '../token/useToken'
import { HydratedCompensationInfoItem } from './type'

export function hydrateNegativeMoneyInfo(raw: SHOW_INFO): HydratedCompensationInfoItem {
  const { getToken } = useToken.getState()
  const { jsonInfos } = useLiquidity.getState()
  const jsonInfo = jsonInfos.find((i) => isPubEqual(i.id, raw.ammId))
  const base = getToken(jsonInfo?.baseMint)
  const quote = getToken(jsonInfo?.quoteMint)
  const snapshotLpAmount = getToken(jsonInfo?.lpMint)
    ? toTokenAmount(getToken(jsonInfo?.lpMint)!, raw.snapshotLpAmount)
    : undefined
  return {
    ...raw,
    rawInfo: raw,
    poolName: `${base?.symbol ?? ''}-${quote?.symbol ?? ''}`,
    snapshotLpAmount,
    openTime: new Date(raw.openTime * 1000),
    endTime: new Date(raw.endTime * 1000),
    tokenInfo: raw.tokenInfo.map((rawTokenInfo) => {
      const token = getToken(rawTokenInfo.mintAddress)
      if (!token) return undefined
      const perLpLoss = toTokenAmount(token, rawTokenInfo.perLpLoss)
      return {
        ...rawTokenInfo,
        token,
        perLpLoss,
        ownerAllLossAmount: toTokenAmount(token, mul(snapshotLpAmount, perLpLoss), { alreadyDecimaled: true }),
        debtAmount: toTokenAmount(token, rawTokenInfo.debtAmount)
      }
    })
  }
}
