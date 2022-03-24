import BN from 'bn.js'

import useToken from '@/application/token/useToken'
import { HexAddress, PublicKeyish } from '@/types/constants'
import { Connection, PublicKey } from '@solana/web3.js'

import { Ido } from '../sdk'
import { HydratedIdoInfo, IdoBannerInformations, SdkParsedIdoInfo } from '../type'
import { hydrateIdoInfo } from './hydrateIdoInfo'
import toPubString, { toPub } from '@/functions/format/toMintString'
import useConnection from '@/application/connection/useConnection'
import useWallet from '@/application/wallet/useWallet'
import asyncMap from '@/functions/asyncMap'
import { fetchRawIdoListJson } from './fetchRawIdoListJson'
import { objectShakeNil } from '@/functions/objectMethods'

const idoListCache = new Map<HydratedIdoInfo['id'], HydratedIdoInfo>()
let idoBannerInfos: IdoBannerInformations

/**
 * rawIdoList + info from SDK
 *
 * ido base info is depends on `fetchRawIdoListJson()`
 */
export const getAllHydratedIdoInfos = async (options?: {
  owner?: PublicKeyish
}): Promise<HydratedIdoInfo[] | undefined> => {
  if (idoListCache.size) return [...idoListCache.values()]
  const { connection } = useConnection.getState()
  const { owner: currentWalletOwner } = useWallet.getState()
  if (!connection) return
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
    owner: toPub(options?.owner) ?? currentWalletOwner,
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
  return parsed
}

/**
 * just fetch an single ido
 * @todo if {@link getAllHydratedIdoInfos} can get single ido detail, this method is actually unnecessary
 */
export const getSingleHydratedIdoInfo = async ({
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
    const result = await getAllHydratedIdoInfos({
      owner: options?.owner
    })
    parsed = result
    parsed?.forEach((info) => idoListCache.set(info.id, info))
  }

  // @ts-expect-error force
  return parsed?.find((idoDetail) => idoDetail.id === String(idoId))
}

type ShowHydratedIdoInfos = {
  [idoId: string]: {
    [ownerId: string]: HydratedIdoInfo
  }
}

/**
 * just fetch some single ido by shadowWallets
 */
export async function shadowlyGetHydratedIdoInfo(): Promise<ShowHydratedIdoInfos> {
  const { shadowKeypairs } = useWallet.getState()
  if (!shadowKeypairs) return {}
  const allResult = await asyncMap(shadowKeypairs ?? [], (keypairs) =>
    getAllHydratedIdoInfos({ owner: keypairs.publicKey })
  )
  const tempResultArray: { owner: HexAddress; idoId: HexAddress; idoInfo: HydratedIdoInfo }[] = allResult.flatMap(
    (oneOwnerIdoInfo, idx) => {
      if (!oneOwnerIdoInfo) return []
      const owner = toPubString(shadowKeypairs[idx].publicKey)
      return oneOwnerIdoInfo.map((info) => ({ owner, idoId: info.id, idoInfo: info }))
    }
  )
  const structured = tempResultArray.reduce(
    (acc, { owner, idoId, idoInfo }) => ({ ...acc, [idoId]: { ...acc[idoId], [owner]: idoInfo } }),
    {} as ShowHydratedIdoInfos
  )
  return structured
}

export async function refreshIdoInfo(idoid: string) {
  /** TODO */
}
