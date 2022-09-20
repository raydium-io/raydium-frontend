import { LiquidityPoolJsonInfo } from 'test-r-sdk'

export default function searchJsonLiquidityInfo(
  partialJsonInfo: Partial<LiquidityPoolJsonInfo>,
  jsonInfos: LiquidityPoolJsonInfo[] = []
): LiquidityPoolJsonInfo | undefined {
  const jsonInfo = jsonInfos?.find((jsonInfo) =>
    Object.entries(partialJsonInfo).every(([key, value]) => jsonInfo[key] === value)
  )
  return jsonInfo
}
