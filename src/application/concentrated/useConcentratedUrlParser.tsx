import useAppSettings from '@/application/appSettings/useAppSettings'
import useNotification from '@/application/notification/useNotification'
import useToken from '@/application/token/useToken'
import { throttle } from '@/functions/debounce'
import toPubString from '@/functions/format/toMintString'
import { areShallowEqual, isStringInsensitivelyEqual } from '@/functions/judgers/areEqual'
import { objectShakeFalsy } from '@/functions/objectMethods'
import useAsyncEffect from '@/hooks/useAsyncEffect'
import { useRecordedEffect } from '@/hooks/useRecordedEffect'
import { EnumStr } from '@/types/constants'
import { useRouter } from 'next/router'
import { ParsedUrlQuery } from 'querystring'
import { useCallback, useEffect, useRef, useState } from 'react'
import useConnection from '../connection/useConnection'
import { getUserTokenEvenNotExist } from '../token/getUserTokenEvenNotExist'
import useConcentrated from './useConcentrated'

export default function useConcentratedUrlParser() {
  const { query, pathname, replace } = useRouter()
  const concentratedCoin1 = useConcentrated((s) => s.coin1)
  const concentratedCoin2 = useConcentrated((s) => s.coin2)
  const concentratedCoin1Amount = useConcentrated((s) => s.coin1Amount)
  const concentratedCoin2Amount = useConcentrated((s) => s.coin2Amount)
  const concentratedFocusSide = useConcentrated((s) => s.focusSide)
  const LiquidityPoolJsonInfos = useConcentrated((s) => s.jsonInfos)
  const concentratedAmmId = useConcentrated((s) => s.ammId)
  const isRemoveDialogOpen = useConcentrated((s) => s.isRemoveDialogOpen)

  const findConcentratedInfoByAmmId = useCallback(
    (ammid: string) => LiquidityPoolJsonInfos.find((jsonInfo) => jsonInfo.id === ammid),
    [LiquidityPoolJsonInfos]
  )
  const findConcentratedInfoByTokenMint = useConcentrated((s) => s.findConcentratedInfoByTokenMint)
  const tokens = useToken((s) => s.tokens)
  const userAddedTokens = useToken((s) => s.userAddedTokens)
  const connection = useConnection((s) => s.connection)
  const getToken = useToken((s) => s.getToken)
  const toUrlMint = useToken((s) => s.toUrlMint)
  const inCleanUrlMode = useAppSettings((s) => s.inCleanUrlMode)

  // flag: 'get info from url' period  or  'affect info to url' period
  const [haveInit, setHaveInit] = useState(false)

  useEffect(() => {
    // when not /concentrated page, reset flag
    if (!pathname.includes('/concentrated/add')) {
      setHaveInit(false)
    }
  }, [pathname])

  useEffect(() => {
    // when refresh window, reset flag
    const unload = () => setHaveInit(false)
    globalThis?.addEventListener('beforeunload', unload)
    return () => globalThis?.removeEventListener('beforeunload', unload)
  }, [])

  // From url
  useAsyncEffect(async () => {
    // only get data from url when /concentrated page is route from other page
    if (!pathname.includes('/concentrated/add')) return
    if (!connection) return // parse must relay on connection
    // not in 'from url' period
    if (haveInit) return

    const { logWarning } = useNotification.getState()

    const {
      ammId: urlAmmId,
      coin0: urlCoin1Mint,
      coin1: urlCoin2Mint,
      symbol0: urlCoin1Symbol,
      symbol1: urlCoin2Symbol
    } = getConcentratedInfoFromQuery(query)

    // add url's symbol

    const urlCoin1 = await getUserTokenEvenNotExist(urlCoin1Mint, urlCoin1Symbol)
    const urlCoin2 = await getUserTokenEvenNotExist(urlCoin2Mint, urlCoin2Symbol)

    const urlCoin1Amount = String(query.amount0 ?? '')
    const urlCoin2Amount = String(query.amount1 ?? '')
    // eslint-disable-next-line @typescript-eslint/ban-types
    const urlFixedSide = String(query.fixed ?? '') as EnumStr | 'coin0' | 'coin1'
    const mode = String(query.mode ?? '')

    if (urlAmmId || urlCoin1Mint || urlCoin2Mint) {
      // from URL: according to user's ammId (or coin1 & coin2) , match concentrated pool json info
      const matchedConcentratedJsonInfo = urlAmmId
        ? findConcentratedInfoByAmmId(urlAmmId)
        : urlCoin1 && urlCoin2
        ? (await findConcentratedInfoByTokenMint(urlCoin1.mint, urlCoin2.mint)).best
        : undefined

      const coin1 = getToken(matchedConcentratedJsonInfo?.baseMint) ?? urlCoin1
      const coin2 = getToken(matchedConcentratedJsonInfo?.quoteMint) ?? urlCoin2

      // sync to zustand store
      if (
        toPubString(concentratedCoin1?.mint) + toPubString(concentratedCoin2?.mint) !==
          toPubString(coin1?.mint) + toPubString(coin2?.mint) &&
        toPubString(concentratedCoin1?.mint) + toPubString(concentratedCoin2?.mint) !==
          toPubString(coin2?.mint) + toPubString(coin1?.mint)
      ) {
        useConcentrated.setState(objectShakeFalsy({ coin1, coin2: coin1 === coin2 ? undefined : coin2 }))
      }

      if (matchedConcentratedJsonInfo) {
        useConcentrated.setState({
          currentJsonInfo: matchedConcentratedJsonInfo,
          ammId: matchedConcentratedJsonInfo.id
        })
      } else if (urlAmmId) {
        // may be just haven't load LiquidityPoolJsonInfos yet
        if (LiquidityPoolJsonInfos.length > 0) logWarning(`can't find Concentrated pool with url ammId`)
      }
    }

    // if not load enough data(no concentrated pools or no tokens), do not change flag
    if (LiquidityPoolJsonInfos.length > 0 && Object.keys(tokens).length > 0) {
      setHaveInit(true)
    }

    // parse amount
    const coin1Amount = urlCoin1Mint ? urlCoin1Amount : urlCoin2Mint ? urlCoin2Amount : undefined
    const coin2Amount = urlCoin2Mint ? urlCoin2Amount : urlCoin1Mint ? urlCoin1Amount : undefined
    if (coin1Amount) useConcentrated.setState({ coin1Amount: coin1Amount })
    if (coin2Amount) useConcentrated.setState({ coin2Amount: coin2Amount })

    // get mode
    if (mode && mode.toLowerCase() === 'removeConcentrated'.toLowerCase()) {
      const { isRemoveDialogOpen } = useConcentrated.getState()
      if (isRemoveDialogOpen) return
      useConcentrated.setState({ isRemoveDialogOpen: true })
    }

    // parse fixed side
    const currentFixedSide = concentratedFocusSide === 'coin1' ? 'coin0' : 'coin1'
    const isUrlFixedSideValid = urlFixedSide === 'coin0' || urlFixedSide === 'coin1'
    if (isUrlFixedSideValid && currentFixedSide !== urlFixedSide) {
      const correspondingFocusSide = urlFixedSide === 'coin0' ? 'coin1' : 'coin2'
      useConcentrated.setState({ focusSide: correspondingFocusSide })
    }
  }, [
    haveInit,
    connection,
    pathname,
    query,
    getToken,
    tokens,
    userAddedTokens,
    replace,

    concentratedCoin1,
    concentratedCoin2,

    LiquidityPoolJsonInfos,
    findConcentratedInfoByAmmId,
    findConcentratedInfoByTokenMint
  ])

  //#region ------------------- sync zustand data to url -------------------
  const throttledUpdateUrl = useCallback(
    throttle(
      (pathname: string, query: Record<string, any>) => {
        replace({ pathname, query }, undefined, { shallow: true })
      },
      { delay: 500 }
    ),
    []
  )
  useRecordedEffect(() => {
    if (!pathname.includes('/concentrated/add')) return

    // not in 'from url' period
    if (!haveInit) return

    // no need to affact change to url if it's  clean-url-mode
    if (inCleanUrlMode) return

    const coin1Mint = concentratedCoin1 ? toUrlMint(concentratedCoin1) : ''
    const coin2Mint = concentratedCoin2 ? toUrlMint(concentratedCoin2) : ''
    const coin1Symbol = concentratedCoin1?.userAdded ? concentratedCoin1.symbol : undefined
    const coin2Symbol = concentratedCoin2?.userAdded ? concentratedCoin2.symbol : undefined

    const urlInfo = getConcentratedInfoFromQuery(query)

    // attach state to url
    const dataInfo = objectShakeFalsy({
      coin0: coin1Mint,
      symbol0: coin1Symbol,
      amount0: concentratedCoin1Amount,

      coin1: coin2Mint,
      symbol1: coin2Symbol,
      amount1: concentratedCoin2Amount,

      fixed: concentratedFocusSide === 'coin1' ? 'coin0' : 'coin1',
      ammId: concentratedAmmId,
      mode: isRemoveDialogOpen ? 'removeConcentrated' : ''
    })

    const urlNeedUpdate = !areShallowEqual(urlInfo, dataInfo)
    if (urlNeedUpdate) throttledUpdateUrl(pathname, dataInfo)
  }, [
    haveInit,
    inCleanUrlMode,
    concentratedCoin1,
    concentratedCoin2,
    concentratedCoin1Amount,
    concentratedCoin2Amount,
    concentratedFocusSide,
    concentratedAmmId,
    isRemoveDialogOpen,
    query,
    replace,
    pathname
  ])
  //#endregion
}

function getConcentratedInfoFromQuery(query: ParsedUrlQuery): {
  coin0: string
  symbol0: string
  coin1: string
  symbol1: string
  amount0: string
  amount1: string
  fixed: string
  ammId: string
  mode: string
} {
  const notTouchableSymbols = ['ray', 'sol'] // url can't have red symbol
  const rawObj = {
    coin0: String(query.coin0 ?? ''),
    symbol0: String(query.symbol0 ?? ''),
    coin1: String(query.coin1 ?? ''),
    symbol1: String(query.symbol1 ?? ''),
    amount0: String(query.amount0 ?? ''),
    amount1: String(query.amount1 ?? ''),
    fixed: String(query.fixed ?? ''),
    ammId: String(query.ammId ?? query.ammid ?? ''),
    mode: String(query.mode ?? '')
  }
  if (notTouchableSymbols.some((symbol) => isStringInsensitivelyEqual(symbol, rawObj.symbol0))) {
    rawObj.coin0 = ''
    rawObj.amount0 = ''
    rawObj.symbol0 = ''
  }
  if (notTouchableSymbols.some((symbol) => isStringInsensitivelyEqual(symbol, rawObj.symbol1))) {
    rawObj.coin1 = ''
    rawObj.amount1 = ''
    rawObj.symbol1 = ''
  }
  return objectShakeFalsy(rawObj)
}
