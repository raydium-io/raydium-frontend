import jFetch from '@/functions/dom/jFetch'
import { toPub, tryToPub } from '@/functions/format/toMintString'
import { isArray, isObject } from '@/functions/judgers/dateType'
import { isInBonsaiTest, isInLocalhost } from '@/functions/judgers/isSSR'
import { objectMap } from '@/functions/objectMethods'
import { PublicKeyish } from 'test-r-sdk'
import { isString } from '@sentry/utils'
import { Connection } from '@solana/web3.js'
import { Ido } from './sdk'
import { BackendApiIdoListItem, BackendApiIdoProjectDetails } from './type'

export async function fetchRawIdoListJson(): Promise<BackendApiIdoListItem[]> {
  const response = await jFetch<{
    success: boolean
    data: BackendApiIdoListItem[]
  }>('https://api.raydium.io/v2/main/ido/pools', {
    afterJson: (res) => ({
      success: res?.success,
      data: res?.data?.map((item: BackendApiIdoListItem) =>
        objectMap(item, (v, k) => {
          if (k === 'startTime' || k === 'endTime' || k === 'stakeTimeEnd' || k === 'startWithdrawTime') {
            return (v as number) * 1000
          }
          return v
        })
      )
    })
  })
  if (!response?.success) return []
  if (isInLocalhost || isInBonsaiTest) {
    const devIdoList =
      (await jFetch<any[]>('/ido-list.json', {
        afterJson: (res) =>
          res?.map((item: BackendApiIdoListItem) =>
            objectMap(item, (v, k) => {
              if (k === 'startTime' || k === 'endTime' || k === 'stakeTimeEnd' || k === 'startWithdrawTime') {
                return (v as number) * 1000
              }
              return v
            })
          )
      })) ?? []
    return devIdoList.concat(response.data)
  } else {
    return response.data
  }
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

export async function getSdkIdoList({
  publicKeyed,
  owner,
  connection,
  options
}: {
  publicKeyed: any[]
  owner?: PublicKeyish
  connection: Connection
  options?: {
    noIdoState?: boolean
  }
}) {
  return await Ido.getMultipleInfo({
    connection,
    poolsConfig: publicKeyed,
    owner: toPub(owner),
    noNeedState: options?.noIdoState,
    config: { batchRequest: true }
  })
}
