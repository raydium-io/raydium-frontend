import { toTokenAmount } from '@/functions/format/toTokenAmount'
import { isPubEqual } from '@/functions/judgers/areEqual'
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
  return {
    ...raw,
    rawInfo: raw,
    poolName: `${base?.symbol ?? ''}-${quote?.symbol ?? ''}`,
    snapshotLpAmount: getToken(jsonInfo?.lpMint)
      ? toTokenAmount(getToken(jsonInfo?.lpMint)!, raw.snapshotLpAmount)
      : undefined,
    openTime: new Date(raw.openTime * 1000),
    endTime: new Date(raw.endTime * 1000),
    tokenInfo: raw.tokenInfo.map((rawTokenInfo) => {
      const token = getToken(rawTokenInfo.mintAddress)
      if (!token) return undefined
      return {
        ...rawTokenInfo,
        token,
        perLpLoss: toTokenAmount(token, rawTokenInfo.perLpLoss),
        ownerAllLossAmount: toTokenAmount(token, rawTokenInfo.ownerAllLossAmount),
        debtAmount: toTokenAmount(token, rawTokenInfo.debtAmount)
      }
    })
  }
}
