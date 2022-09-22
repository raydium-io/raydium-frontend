import useAppSettings from '@/application/appSettings/useAppSettings'
import useNotification from '@/application/notification/useNotification'
import useToken from '@/application/token/useToken'
import { throttle } from '@/functions/debounce'
import toPubString from '@/functions/format/toMintString'
import { areShallowEqual, isStringInsensitivelyEqual } from '@/functions/judgers/areEqual'
import { objectShakeFalsy } from '@/functions/objectMethods'
import useAsyncEffect from '@/hooks/useAsyncEffect'
import { useRecordedEffect } from '@/hooks/useRecordedEffect'
import { getAddLiquidityDefaultPool } from '@/models/ammAndLiquidity'
import { EnumStr } from '@/types/constants'
import { useRouter } from 'next/router'
import { ParsedUrlQuery } from 'querystring'
import { useCallback, useEffect, useState } from 'react'
import useConnection from '../connection/useConnection'
import { getUserTokenEvenNotExist } from '../token/getUserTokenEvenNotExist'
import useLiquidity from './useLiquidity'

export default function useLiquidityUrlParser() {
  const { query, pathname, replace } = useRouter()
  const liquidityCoin1 = useLiquidity((s) => s.coin1)
  const liquidityCoin2 = useLiquidity((s) => s.coin2)
  const liquidityCoin1Amount = useLiquidity((s) => s.coin1Amount)
  const liquidityCoin2Amount = useLiquidity((s) => s.coin2Amount)
  const liquidityFocusSide = useLiquidity((s) => s.focusSide)
  const liquidityPoolJsonInfos = useLiquidity((s) => s.jsonInfos)
  const liquidityAmmId = useLiquidity((s) => s.ammId)
  const isRemoveDialogOpen = useLiquidity((s) => s.isRemoveDialogOpen)

  const findLiquidityInfoByAmmId = useCallback(
    (ammid: string) => liquidityPoolJsonInfos.find((jsonInfo) => jsonInfo.id === ammid),
    [liquidityPoolJsonInfos]
  )
  const tokens = useToken((s) => s.tokens)
  const userAddedTokens = useToken((s) => s.userAddedTokens)
  const connection = useConnection((s) => s.connection)
  const getToken = useToken((s) => s.getToken)
  const toUrlMint = useToken((s) => s.toUrlMint)
  const inCleanUrlMode = useAppSettings((s) => s.inCleanUrlMode)

  // flag: 'get info from url' period  or  'affect info to url' period
  const [haveInit, setHaveInit] = useState(false)

  useEffect(() => {
    // when not /liquidity page, reset flag
    if (!pathname.includes('/liquidity/add')) {
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
    // only get data from url when /liquidity page is route from other page
    if (!pathname.includes('/liquidity/add')) return
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
    } = getLiquidityInfoFromQuery(query)

    // add url's symbol

    const urlCoin1 = await getUserTokenEvenNotExist(urlCoin1Mint, urlCoin1Symbol)
    const urlCoin2 = await getUserTokenEvenNotExist(urlCoin2Mint, urlCoin2Symbol)

    const urlCoin1Amount = String(query.amount0 ?? '')
    const urlCoin2Amount = String(query.amount1 ?? '')
    // eslint-disable-next-line @typescript-eslint/ban-types
    const urlFixedSide = String(query.fixed ?? '') as EnumStr | 'coin0' | 'coin1'
    const mode = String(query.mode ?? '')

    if (urlAmmId || urlCoin1Mint || urlCoin2Mint) {
      // from URL: according to user's ammId (or coin1 & coin2) , match liquidity pool json info
      const matchedLiquidityJsonInfo = urlAmmId
        ? findLiquidityInfoByAmmId(urlAmmId)
        : urlCoin1 && urlCoin2
        ? await getAddLiquidityDefaultPool({ mint1: urlCoin1Mint, mint2: urlCoin2Mint })
        : undefined

      const coin1 = getToken(matchedLiquidityJsonInfo?.baseMint) ?? urlCoin1
      const coin2 = getToken(matchedLiquidityJsonInfo?.quoteMint) ?? urlCoin2

      // sync to zustand store
      if (
        toPubString(liquidityCoin1?.mint) + toPubString(liquidityCoin2?.mint) !==
          toPubString(coin1?.mint) + toPubString(coin2?.mint) &&
        toPubString(liquidityCoin1?.mint) + toPubString(liquidityCoin2?.mint) !==
          toPubString(coin2?.mint) + toPubString(coin1?.mint)
      ) {
        useLiquidity.setState(objectShakeFalsy({ coin1, coin2: coin1 === coin2 ? undefined : coin2 }))
      }

      if (matchedLiquidityJsonInfo) {
        useLiquidity.setState({
          currentJsonInfo: matchedLiquidityJsonInfo,
          ammId: matchedLiquidityJsonInfo.id
        })
      } else if (urlAmmId) {
        // may be just haven't load liquidityPoolJsonInfos yet
        if (liquidityPoolJsonInfos.length > 0) logWarning(`can't find Liquidity pool with url ammId`)
      }
    }

    // if not load enough data(no liquidity pools or no tokens), do not change flag
    if (liquidityPoolJsonInfos.length > 0 && Object.keys(tokens).length > 0) {
      setHaveInit(true)
    }

    // parse amount
    const coin1Amount = urlCoin1Mint ? urlCoin1Amount : urlCoin2Mint ? urlCoin2Amount : undefined
    const coin2Amount = urlCoin2Mint ? urlCoin2Amount : urlCoin1Mint ? urlCoin1Amount : undefined
    if (coin1Amount) useLiquidity.setState({ coin1Amount: coin1Amount })
    if (coin2Amount) useLiquidity.setState({ coin2Amount: coin2Amount })

    // get mode
    if (mode && mode.toLowerCase() === 'removeLiquidity'.toLowerCase()) {
      const { isRemoveDialogOpen } = useLiquidity.getState()
      if (isRemoveDialogOpen) return
      useLiquidity.setState({ isRemoveDialogOpen: true })
    }

    // parse fixed side
    const currentFixedSide = liquidityFocusSide === 'coin1' ? 'coin0' : 'coin1'
    const isUrlFixedSideValid = urlFixedSide === 'coin0' || urlFixedSide === 'coin1'
    if (isUrlFixedSideValid && currentFixedSide !== urlFixedSide) {
      const correspondingFocusSide = urlFixedSide === 'coin0' ? 'coin1' : 'coin2'
      useLiquidity.setState({ focusSide: correspondingFocusSide })
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

    liquidityCoin1,
    liquidityCoin2,

    liquidityPoolJsonInfos,
    findLiquidityInfoByAmmId
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
    if (!pathname.includes('/liquidity/add')) return

    // not in 'from url' period
    if (!haveInit) return

    // no need to affact change to url if it's  clean-url-mode
    if (inCleanUrlMode) return

    const coin1Mint = liquidityCoin1 ? toUrlMint(liquidityCoin1) : ''
    const coin2Mint = liquidityCoin2 ? toUrlMint(liquidityCoin2) : ''
    const coin1Symbol = liquidityCoin1?.userAdded ? liquidityCoin1.symbol : undefined
    const coin2Symbol = liquidityCoin2?.userAdded ? liquidityCoin2.symbol : undefined

    const urlInfo = getLiquidityInfoFromQuery(query)

    // attach state to url
    const dataInfo = objectShakeFalsy({
      coin0: coin1Mint,
      symbol0: coin1Symbol,
      amount0: liquidityCoin1Amount,

      coin1: coin2Mint,
      symbol1: coin2Symbol,
      amount1: liquidityCoin2Amount,

      fixed: liquidityFocusSide === 'coin1' ? 'coin0' : 'coin1',
      ammId: liquidityAmmId,
      mode: isRemoveDialogOpen ? 'removeLiquidity' : ''
    })

    const urlNeedUpdate = !areShallowEqual(urlInfo, dataInfo)
    if (urlNeedUpdate) throttledUpdateUrl(pathname, dataInfo)
  }, [
    haveInit,
    inCleanUrlMode,
    liquidityCoin1,
    liquidityCoin2,
    liquidityCoin1Amount,
    liquidityCoin2Amount,
    liquidityFocusSide,
    liquidityAmmId,
    isRemoveDialogOpen,
    query,
    replace,
    pathname
  ])
  //#endregion
}

function getLiquidityInfoFromQuery(query: ParsedUrlQuery): {
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
