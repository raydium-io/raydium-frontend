import jFetch from '@/functions/dom/jFetch'
import { objectMap } from '@/functions/objectMethods'
import { BackendApiIdoListItem, BackendApiIdoProjectDetails } from '../type'

export async function fetchRawIdoListJson(): Promise<BackendApiIdoListItem[]> {
  const response = await jFetch<{
    success: boolean
    data: BackendApiIdoListItem[]
  }>('https://api.raydium.io/v2/main/ido/pools', {
    afterJson: (res) => ({
      success: res?.success,
      data: res?.data?.map((item: BackendApiIdoListItem) =>
        objectMap(item, (v, k) => {
          if (
            k === 'startTime' ||
            k === 'endTime' ||
            k === 'stakeTimeEnd' ||
            k === 'startWithdrawTime' ||
            k === 'withdrawTimeQuote'
          ) {
            return (v as number) * 1000
          }
          return v
        })
      )
    })
  })
  if (!response?.success) return []
  return response.data
}

export async function fetchRawIdoProjectInfoJson({
  idoId
}: {
  idoId: string
}): Promise<BackendApiIdoProjectDetails | undefined> {
  const response = await jFetch<{ projectInfo?: BackendApiIdoProjectDetails }>(
    `https://api.raydium.io/v2/main/ido/project/${idoId}`
  )
  if (!response?.projectInfo) return
  return response.projectInfo
}
