import { ApiPoolInfoItem } from '@raydium-io/raydium-sdk'

export default function searchJsonConcentratedInfo(
  partialJsonInfo: Partial<ApiPoolInfoItem>,
  jsonInfos: ApiPoolInfoItem[] = []
): ApiPoolInfoItem | undefined {
  const jsonInfo = jsonInfos?.find((jsonInfo) =>
    Object.entries(partialJsonInfo).every(([key, value]) => jsonInfo[key] === value)
  )
  return jsonInfo
}
