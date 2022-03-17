import BN from 'bn.js'

import useToken from '@/application/token/useToken'
import jFetch from '@/functions/dom/jFetch'
import { PublicKeyish } from '@/types/constants'
import { Adapter, WalletAdapter } from '@solana/wallet-adapter-base'
import { Connection, PublicKey } from '@solana/web3.js'

import { Ido } from '../sdk'
import { HydratedIdoInfo, IdoBannerInformations, RawIdoListJson, SdkParsedIdoInfo } from '../type'
import { hydrateIdoInfo } from './hydrateIdoInfo'

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
export const fetchIdoList = async ({
  connection,
  walletAdapter,

  shouldFetchDetailInfo,
  noCache
}: {
  connection: Connection
  walletAdapter: Adapter | undefined

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
    owner: shouldFetchDetailInfo ? walletAdapter?.publicKey ?? undefined : undefined,
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
  connection,
  walletAdapter,

  idoId,
  noCache
}: {
  connection: Connection
  walletAdapter: Adapter | undefined

  idoId: PublicKeyish
  noCache?: boolean
}): Promise<Required<HydratedIdoInfo> | undefined> => {
  let parsed: HydratedIdoInfo[] | undefined = undefined

  if (!noCache && !idoListCache.size) {
    parsed = [...idoListCache.values()]
  } else {
    // TODO: only one detail info. not all detail info.
    parsed = (
      await fetchIdoList({ connection, walletAdapter, shouldFetchDetailInfo: true, noCache }).catch(console.error)
    )?.list
    parsed?.forEach((info) => idoListCache.set(info.id, info))
  }

  // @ts-expect-error force
  return parsed?.find((idoDetail) => idoDetail.id === String(idoId))
}
