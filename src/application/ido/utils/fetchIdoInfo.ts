import BN from 'bn.js'

import useToken from '@/application/token/useToken'
import jFetch from '@/functions/dom/jFetch'
import { PublicKeyish } from '@/types/constants'
import { Connection, PublicKey } from '@solana/web3.js'

import { Ido } from '../sdk'
import { HydratedIdoInfo, IdoBannerInformations, RawIdoListJson, SdkParsedIdoInfo } from '../type'
import { hydrateIdoInfo } from './hydrateIdoInfo'
import { toPub } from '@/functions/format/toMintString'
import useConnection from '@/application/connection/useConnection'
import useWallet from '@/application/wallet/useWallet'
import asyncMap from '@/functions/asyncMap'

const idoListCache = new Map<HydratedIdoInfo['id'], HydratedIdoInfo>()
let idoBannerInfos: IdoBannerInformations

async function fetchRawIdoListJson(): Promise<RawIdoListJson> {
  // eslint-disable-next-line no-console
  console.info('idoList start fetching')
  const data = await jFetch('/ido-list.json')
  // eslint-disable-next-line no-console
  console.info('idoList end fetching')
  return data
}

/**
 * rawIdoList + info from SDK
 */
export const getHydratedIdoInfos = async ({
  connection,
  owner,

  shouldFetchDetailInfo,
  noCache
}: {
  connection: Connection
  owner?: PublicKeyish

  shouldFetchDetailInfo?: boolean
  noCache?: boolean
}): Promise<{ list: HydratedIdoInfo[]; bannerInfo: IdoBannerInformations } | undefined> => {
  if (!noCache && idoListCache.size) return { list: [...idoListCache.values()], bannerInfo: idoBannerInfos }
  const data = await fetchRawIdoListJson()

  const env = process.env.NODE_ENV

  const rawList = env === 'production' ? data.official.filter((list) => !list.onlyDev) : data.official
  idoBannerInfos = data.bannerInfo

  const publicKeyed = rawList.map((raw) =>
    Object.fromEntries(
      Object.entries(raw).map(([key, value]) => {
        if (typeof value === 'string') {
          try {
            const publicValue = new PublicKey(value)
            return [key, publicValue]
          } catch {
            return [key, value]
          }
        }
        return [key, value]
      })
    )
  )
  // eslint-disable-next-line no-console
  console.info('idoList data start layout fetching')
  const result = await Ido.getMultipleInfo({
    connection,
    poolsConfig: publicKeyed as any[],
    owner: shouldFetchDetailInfo ? toPub(owner) : undefined, //TODO
    config: { batchRequest: true }
  })
  // eslint-disable-next-line no-console
  console.info('idoList data end layout fetching')
  const { getToken } = useToken.getState()
  const parsedPomised = result?.map(async (raw, idx) => {
    const baseCoinInfoBase = {
      ...(await getToken(String(raw.state.baseMint))), // TODO: `getToken()` should include customized token list
      iconSrc: await getToken(raw.state.baseMint)?.icon
    }
    const baseCoinInfoQuote = {
      ...(await getToken(String(raw.state.quoteMint))),
      iconSrc: await getToken(raw.state.quoteMint)?.icon
    }
    const idoInfo = {
      ...rawList[idx], // still need? prove it!
      ...raw,
      base: baseCoinInfoBase,
      quote: baseCoinInfoQuote,
      isRayPool: false,
      isPrivate: false,
      state: {
        ...raw.state,
        startTime: new BN(raw.state.startTime.toNumber() * 1000),
        endTime: new BN(raw.state.endTime.toNumber() * 1000),
        startWithdrawTime: new BN(raw.state.startWithdrawTime.toNumber() * 1000)
      }
    } as SdkParsedIdoInfo
    const hydratedInfo = hydrateIdoInfo(idoInfo)
    return hydratedInfo
  })
  const parsed = await Promise.all(parsedPomised)

  idoListCache.clear()
  parsed.forEach((info) => idoListCache.set(info.id, info))
  // eslint-disable-next-line no-console
  console.info('idoList end parsing')
  return { list: parsed, bannerInfo: idoBannerInfos }
}

/**
 * just fetch an single ido
 */
export const fetchIdoDetail = async ({
  idoId,
  options
}: {
  idoId: PublicKeyish
  options?: {
    /** detect a special owner, default will be current connceted  */
    owner?: PublicKeyish
  }
}): Promise<Required<HydratedIdoInfo> | undefined> => {
  let parsed: HydratedIdoInfo[] | undefined = undefined
  const { connection } = useConnection.getState()
  if (!connection) return

  if (idoListCache.size) {
    parsed = [...idoListCache.values()]
  } else {
    // TODO: only one detail info. not all detail info.
    const result = (
      await getHydratedIdoInfos({
        connection,
        owner: options?.owner ?? useWallet.getState().owner,
        shouldFetchDetailInfo: true
      }).catch(console.error)
    )?.list // TODO: Temporary just one owner
    parsed = result
    parsed?.forEach((info) => idoListCache.set(info.id, info))
  }

  // @ts-expect-error force
  return parsed?.find((idoDetail) => idoDetail.id === String(idoId))
}

/**
 * just fetch some single ido by shadowWallets
 */
export async function shadowlyFetchIdoDetail({
  idoId
}: {
  idoId: PublicKeyish
}): Promise<(Required<HydratedIdoInfo> | undefined)[]> {
  const { shadowKeypairs } = useWallet.getState()
  return asyncMap(shadowKeypairs ?? [], (keypairs) => fetchIdoDetail({ idoId, options: { owner: keypairs.publicKey } }))
}
