import { useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'

import { PublicKeyish } from '@raydium-io/raydium-sdk'

import useAppSettings from '@/application/appSettings/useAppSettings'
import useNotification from '@/application/notification/useNotification'
import useToken from '@/application/token/useToken'
import { throttle } from '@/functions/debounce'
import { areShallowEqual } from '@/functions/judgers/areEqual'
import { objectShakeFalsy } from '@/functions/objectMethods'
import useAsyncEffect from '@/hooks/useAsyncEffect'
import { useRecordedEffect } from '@/hooks/useRecordedEffect'
import { EnumStr } from '@/types/constants'

import useLiquidity from '../useLiquidity'

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
  const findLiquidityInfoByTokenMint = useLiquidity((s) => s.findLiquidityInfoByTokenMint)
  const tokens = useToken((s) => s.tokens)
  const getToken = useToken((s) => s.getToken)
  const toUrlMint = useToken((s) => s.toUrlMint)
  const inCleanUrlMode = useAppSettings((s) => s.inCleanUrlMode)

  // flag: 'get info from url' period  or  'affect info to url' period
  const haveInit = useRef(false)

  useEffect(() => {
    // when not /liquidity page, reset flag
    if (!pathname.includes('/liquidity/add')) {
      haveInit.current = false
    }
  }, [pathname])
  useEffect(() => {
    // when refresh window, reset flag
    const unload = () => (haveInit.current = false)
    globalThis?.addEventListener('beforeunload', unload)
    return () => globalThis?.removeEventListener('beforeunload', unload)
  }, [])

  // From url
  useAsyncEffect(async () => {
    // only get data from url when /liquidity page is route from other page
    if (!pathname.includes('/liquidity/add')) return

    // not in 'from url' period
    if (haveInit.current) return

    const { logWarning } = useNotification.getState()
    const urlAmmId = String(query.ammId ?? query.ammid ?? '')
    const urlCoin1Mint = String(query.coin0 ?? '')
    const urlCoin2Mint = String(query.coin1 ?? '')
    const urlCoin1Amount = String(query.amount0 ?? '')
    const urlCoin2Amount = String(query.amount1 ?? '')
    // eslint-disable-next-line @typescript-eslint/ban-types
    const urlFixedSide = String(query.fixed ?? '') as EnumStr | 'coin0' | 'coin1'
    const mode = String(query.mode ?? '')

    if (urlAmmId || (urlCoin1Mint && urlCoin2Mint)) {
      const urlCoin1 = getToken(urlCoin1Mint)
      const urlCoin2 = getToken(urlCoin2Mint)
      // from URL: according to user's ammId (or coin1 & coin2) , match liquidity pool json info
      const matchedMarketJson = urlAmmId
        ? findLiquidityInfoByAmmId(urlAmmId)
        : urlCoin1 && urlCoin2
        ? (await findLiquidityInfoByTokenMint(urlCoin1.mint, urlCoin2.mint)).best
        : undefined

      const coin1 = urlCoin1Mint
        ? getToken(urlCoin1Mint, { exact: true })
        : urlCoin2Mint
        ? getToken(matchedMarketJson?.quoteMint)
        : getToken(matchedMarketJson?.baseMint)

      const coin2 = urlCoin2Mint
        ? getToken(urlCoin2Mint, { exact: true })
        : urlCoin1Mint
        ? getToken(matchedMarketJson?.baseMint)
        : getToken(matchedMarketJson?.quoteMint)

      // sync to zustand store
      if (
        String(liquidityCoin1?.mint) !== String(coin1?.mint) ||
        String(liquidityCoin2?.mint) !== String(coin2?.mint)
      ) {
        useLiquidity.setState(objectShakeFalsy({ coin1, coin2 }))
      }

      if (matchedMarketJson) {
        useLiquidity.setState({
          currentJsonInfo: matchedMarketJson,
          ammId: matchedMarketJson!.id
        })
      } else if (urlAmmId) {
        // may be just haven't load liquidityPoolJsonInfos yet
        if (liquidityPoolJsonInfos.length > 0) logWarning(`can't find Liquidity pool with url ammId`)
      }
    }

    // if not load enough data(no liquidity pools or no tokens), do not change flag
    if (liquidityPoolJsonInfos.length > 0 && Object.keys(tokens).length > 0) {
      haveInit.current = true
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
    pathname,
    query,
    getToken,
    tokens,
    replace,

    liquidityCoin1,
    liquidityCoin2,

    liquidityPoolJsonInfos,
    findLiquidityInfoByAmmId,
    findLiquidityInfoByTokenMint
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
    if (!haveInit.current) return

    // no need to affact change to url if it's  clean-url-mode
    if (inCleanUrlMode) return

    const coin1Mint = liquidityCoin1 ? toUrlMint(liquidityCoin1) : ''
    const coin2Mint = liquidityCoin2 ? toUrlMint(liquidityCoin2) : ''

    const urlInfo = objectShakeFalsy({
      coin0: String(query.coin0 ?? ''),
      coin1: String(query.coin1 ?? ''),
      amount0: String(query.amount0 ?? ''),
      amount1: String(query.amount1 ?? ''),
      fixed: String(query.fixed ?? ''),
      ammId: String(query.ammId ?? query.ammid ?? ''),
      mode: String(query.mode ?? '')
    })

    // attach state to url
    const dataInfo = objectShakeFalsy({
      coin0: coin1Mint,
      coin1: coin2Mint,
      amount0: liquidityCoin1Amount,
      amount1: liquidityCoin2Amount,
      fixed: liquidityFocusSide === 'coin1' ? 'coin0' : 'coin1',
      ammId: liquidityAmmId,
      mode: isRemoveDialogOpen ? 'removeLiquidity' : ''
    })

    const urlNeedUpdate = !areShallowEqual(urlInfo, dataInfo)
    if (urlNeedUpdate) throttledUpdateUrl(pathname, dataInfo)
  }, [
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
