import useConnection from '@/application/connection/useConnection'
import useWallet from '@/application/wallet/useWallet'
import listToMap from '@/functions/format/listToMap'
import useAsyncEffect from '@/hooks/useAsyncEffect'
import useIdo, { IdoStore } from './useIdo'
import { EffectCheckSetting, shouldEffectBeOn } from '../miscTools'
import useToken from '@/application/token/useToken'
import { fetchRawIdoListJson, fetchRawIdoProjectInfoJson, getSdkIdoList } from './utils/fetchIdoInfo'
import { hydrateIdoInfo } from './utils/hydrateIdoInfo'
import toPubString, { ToPubPropertyValue } from '@/functions/format/toMintString'
import { objectMap, objectShakeNil, pick } from '@/functions/objectMethods'
import { BackendApiIdoListItem } from './type'
import asyncMap from '@/functions/asyncMap'
import { shakeUndifindedItem } from '@/functions/arrayMethods'
import { createSplToken } from '../token/feature/useTokenListsLoader'
import { useRouter } from 'next/router'
import { useEffect } from 'react'

export default function useAutoFetchIdoInfos(options?: { when?: EffectCheckSetting }) {
  const connection = useConnection((s) => s.connection)
  const owner = useWallet((s) => s.owner)
  const shadowKeypairs = useWallet((s) => s.shadowKeypairs)
  const idoRawInfos = useIdo((s) => s.idoRawInfos)
  const currentIdoId = useIdo((s) => s.currentIdoId)
  const idoRefreshFactor = useIdo((s) => s.idoRefreshFactor)
  const tokens = useToken((s) => s.tokens)
  const { pathname } = useRouter()
  const getChainDate = useConnection((s) => s.getChainDate)
  const inIdoDetailPage = pathname.includes('/acceleraytor/detail')

  const getIdoTokens = (rawInfo: BackendApiIdoListItem) => {
    const base = createSplToken({
      mint: rawInfo.baseMint,
      decimals: rawInfo.baseDecimals,
      symbol: rawInfo.baseSymbol,
      icon: rawInfo.baseIcon
    })
    const quote = createSplToken({
      mint: rawInfo.quoteMint,
      decimals: rawInfo.quoteDecimals,
      symbol: rawInfo.quoteSymbol,
      icon: rawInfo.quoteIcon
    })
    return { base, quote }
  }

  // reset temp state
  useEffect(() => {
    if (!owner) return
    useIdo.setState({ tempJoined: false })
  }, [owner])

  // raw list info
  useAsyncEffect(async () => {
    if (!shouldEffectBeOn(options?.when)) return
    const rawList = await fetchRawIdoListJson()
    const hydrated = rawList.map((raw) => {
      const { base, quote } = getIdoTokens(raw)
      return hydrateIdoInfo({ ...raw, base, quote })
    })
    const hydratedInfos = listToMap(hydrated, (i) => i.id)
    useIdo.setState((s) => ({
      idoRawInfos: listToMap(rawList, (i) => i.id),
      idoHydratedInfos: {
        ...s.idoHydratedInfos,
        ...objectMap(hydratedInfos, (newHydratedInfo, idoid) => ({
          ...s.idoHydratedInfos[idoid],
          ...newHydratedInfo
        }))
      }
    }))
  }, [tokens, options?.when])

  // inject project info
  useAsyncEffect(async () => {
    if (!shouldEffectBeOn(options?.when)) return
    if (!currentIdoId) return
    const projectInfo = await fetchRawIdoProjectInfoJson({ idoId: currentIdoId })
    if (!projectInfo) return // some error occurs
    useIdo.setState((s) => ({
      idoProjectInfos: { ...s.idoProjectInfos, [currentIdoId]: projectInfo },
      idoHydratedInfos: {
        ...s.idoHydratedInfos,
        [currentIdoId]: { ...s.idoHydratedInfos[currentIdoId], ...projectInfo }
      }
    }))
  }, [currentIdoId, options?.when])

  // refresh SDK info
  useAsyncEffect(async () => {
    if (!connection) return
    const targetIds = shakeUndifindedItem([idoRefreshFactor?.refreshIdoId].flat())
    const rawList = Object.values(idoRawInfos ?? {}).filter((item) => targetIds.includes(item.id))
    const publicKeyed = ToPubPropertyValue(rawList)

    // get sdk ledger/snapshot and render
    const sdkInfos = await getSdkIdoList({ publicKeyed, connection, owner })
    const hydratedInfos = objectMap(sdkInfos, (sdkInfo, idoid) => {
      const rawInfo = rawList.find(({ id }) => id === idoid)
      if (!rawInfo) return undefined
      const { base, quote } = getIdoTokens(rawInfo)
      return hydrateIdoInfo({ ...rawInfo, ...sdkInfo, base, quote })
    })
    useIdo.setState((s) => ({
      idoSDKInfos: sdkInfos,
      idoHydratedInfos: {
        ...s.idoHydratedInfos,
        ...objectMap(objectShakeNil(hydratedInfos), (newHydratedInfo, idoid) => ({
          ...s.idoHydratedInfos[idoid],
          ...objectShakeNil(newHydratedInfo)
        }))
      }
    }))
  }, [idoRefreshFactor])

  // get SDKInfo, and merge with rawInfo
  useAsyncEffect(async () => {
    if (!shouldEffectBeOn(options?.when)) return
    if (!connection) return
    const rawList = Object.values(
      (inIdoDetailPage && currentIdoId ? pick(idoRawInfos, [currentIdoId]) : idoRawInfos) ?? {}
    )
    const publicKeyed = ToPubPropertyValue(rawList)

    // get sdk ledger/snapshot and render
    const sdkInfos = await getSdkIdoList({ publicKeyed, connection, owner, options: { noIdoState: true } })
    const hydratedInfos = objectMap(sdkInfos, (sdkInfo, idoid) => {
      const rawInfo = rawList.find(({ id }) => id === idoid)
      if (!rawInfo) return undefined
      const { base, quote } = getIdoTokens(rawInfo)
      return hydrateIdoInfo({ ...rawInfo, ...sdkInfo, base, quote })
    })
    useIdo.setState((s) => ({
      idoSDKInfos: sdkInfos,
      idoHydratedInfos: {
        ...s.idoHydratedInfos,
        ...objectMap(objectShakeNil(hydratedInfos), (newHydratedInfo, idoid) => ({
          ...s.idoHydratedInfos[idoid],
          ...objectShakeNil(newHydratedInfo)
        }))
      }
    }))

    // defferly get all
    setTimeout(async () => {
      const sdkInfos = await getSdkIdoList({ publicKeyed, connection, owner })
      const hydratedInfos = objectMap(sdkInfos, (sdkInfo, idoid) => {
        const rawInfo = rawList.find(({ id }) => id === idoid)
        if (!rawInfo) return undefined
        const { base, quote } = getIdoTokens(rawInfo)
        return hydrateIdoInfo({ ...rawInfo, ...sdkInfo, base, quote })
      })
      useIdo.setState((s) => ({
        idoSDKInfos: sdkInfos,
        idoHydratedInfos: {
          ...s.idoHydratedInfos,
          ...objectMap(objectShakeNil(hydratedInfos), (newHydratedInfo, idoid) => ({
            ...s.idoHydratedInfos[idoid],
            ...objectShakeNil(newHydratedInfo)
          }))
        }
      }))
    }, 1000)
  }, [idoRawInfos, currentIdoId, connection, options?.when, owner, inIdoDetailPage])

  useAsyncEffect(async () => {
    if (!shouldEffectBeOn(options?.when)) return
    if (!shadowKeypairs?.length) return
    if (!connection) return
    const rawList = Object.values(idoRawInfos ?? {}).slice(0, 3)
    const publicKeyed = ToPubPropertyValue(rawList)
    const structured = await asyncMap(shadowKeypairs, async ({ publicKey, secretKey }) => {
      const sdkInfos = await getSdkIdoList({ publicKeyed, connection, owner: publicKey })
      const hydratedInfos = objectMap(sdkInfos, (sdkInfo, idoid) => {
        const rawInfo = rawList.find(({ id }) => id === idoid)
        if (!rawInfo) return undefined
        const { base, quote } = getIdoTokens(rawInfo)
        return hydrateIdoInfo({ ...rawInfo, ...sdkInfo, base, quote })
      })
      return [toPubString(publicKey), hydratedInfos]
    })
    const shadowIdoHydratedInfos: NonNullable<IdoStore['shadowIdoHydratedInfos']> = Object.fromEntries(structured)
    useIdo.setState({ shadowIdoHydratedInfos })
  }, [idoRawInfos, connection, shadowKeypairs, options?.when])
}
