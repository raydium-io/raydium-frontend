import { useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'

import useAppSettings from '@/application/appSettings/useAppSettings'
import useLiquidity from '@/application/liquidity/useLiquidity'
import useNotification from '@/application/notification/useNotification'
import { useSwap } from '@/application/swap/useSwap'
import useToken from '@/application/token/useToken'
import { hasSameItems } from '@/functions/arrayMethods'
import { throttle } from '@/functions/debounce'
import { areShallowEqual } from '@/functions/judgers/areEqual'
import { toString } from '@/functions/numberish/toString'
import { objectShakeFalsy } from '@/functions/objectMethods'
import { EnumStr } from '@/types/constants'
import { SplToken } from '../token/type'
import {
  isQuantumSOLVersionSOL,
  isQuantumSOLVersionWSOL,
  QuantumSOLVersionSOL,
  QuantumSOLVersionWSOL,
  WSOLMint
} from '../token/quantumSOL'
import toPubString from '@/functions/format/toMintString'

function isSolAndWsol(query1: string, query2: string): boolean {
  return query1 === 'sol' && query2 === toPubString(WSOLMint)
}
function isWsolAndSol(query1: string, query2: string): boolean {
  return query1 === toPubString(WSOLMint) && query2 === 'sol'
}

export default function useSwapUrlParser(): void {
  const { query, pathname, replace } = useRouter()
  const swapCoin1 = useSwap((s) => s.coin1)
  const swapCoin2 = useSwap((s) => s.coin2)
  const swapCoin1Amount = useSwap((s) => s.coin1Amount)
  const swapCoin2Amount = useSwap((s) => s.coin2Amount)
  const swapFocusSide = useSwap((s) => s.focusSide)
  const swapDirectionReversed = useSwap((s) => s.directionReversed)
  const liquidityPoolJsonInfos = useLiquidity((s) => s.jsonInfos)
  const findLiquidityInfoByAmmId = useCallback(
    (ammid: string) => liquidityPoolJsonInfos.find((jsonInfo) => jsonInfo.id === ammid),
    [liquidityPoolJsonInfos]
  )
  const tokens = useToken((s) => s.tokens)
  const getToken = useToken((s) => s.getToken)
  const toUrlMint = useToken((s) => s.toUrlMint)
  const inCleanUrlMode = useAppSettings((s) => s.inCleanUrlMode)

  // flag: 'get info from url' period  or  'affect info to url' period
  const haveInit = useRef(false)

  useEffect(() => {
    // when not /swap page, reset flag
    if (!pathname.includes('/swap')) {
      haveInit.current = false
    }
  }, [pathname])
  useEffect(() => {
    // when refresh window, reset flag
    const unload = () => (haveInit.current = false)
    globalThis?.addEventListener('beforeunload', unload)
    return () => globalThis?.removeEventListener('beforeunload', unload)
  }, [])

  // from url
  useEffect(() => {
    // only get data from url when /swap page is route from other page
    if (!pathname.includes('/swap')) return

    // not in 'from url' period
    if (haveInit.current) return

    // // eslint-disable-next-line no-console
    // console.info('debug: get swap info from url')

    const urlAmmId = String(query.ammId ?? query.ammid ?? '')
    const urlCoin1Mint = String(query.inputCurrency ?? '')
    const urlCoin2Mint = String(query.outputCurrency ?? '')
    const urlCoin1Amount = String(query.inputAmount ?? '')
    const urlCoin2Amount = String(query.outputAmount ?? '')
    // eslint-disable-next-line @typescript-eslint/ban-types
    const urlFixedSide = String(query.fixed ?? '') as EnumStr | 'in' | 'out'

    if (isSolAndWsol(urlCoin1Mint, urlCoin2Mint)) {
      // SPECIAL CASE: wrap (sol ⇢ wsol)
      useSwap.setState({ coin1: QuantumSOLVersionSOL, coin2: QuantumSOLVersionWSOL })
    } else if (isWsolAndSol(urlCoin1Mint, urlCoin2Mint)) {
      // SPECIAL CASE: unwrap (wsol ⇢ sol)
      useSwap.setState({ coin1: QuantumSOLVersionWSOL, coin2: QuantumSOLVersionSOL })
    } else if (urlAmmId) {
      // from URL: according to user's ammId , match liquidity pool json info, extract it's base and quote as coin1 and coin2
      const { logWarning } = useNotification.getState()
      const matchedMarketJson = findLiquidityInfoByAmmId(urlAmmId)
      if (matchedMarketJson) {
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

        // sync to swap zustand store
        if (
          // already have correct info, no need parse info from url again
          !hasSameItems([urlCoin1Mint, urlCoin2Mint], [String(coin1?.mint), String(coin2?.mint)])
        ) {
          useSwap.setState(objectShakeFalsy({ coin1, coin2 }))
        }
      } else {
        // may be just haven't load liquidityPoolJsonInfos yet
        if (liquidityPoolJsonInfos.length > 0 && Object.keys(tokens || {}).length > 0) {
          logWarning(`can't find Liquidity pool with url ammId`)
        }
      }
    } else if (urlCoin1Mint || urlCoin2Mint) {
      // attach coin1 and coin2 to swap zustand store
      const coin1 = getToken(urlCoin1Mint)
      const coin2 = getToken(urlCoin2Mint)

      if (coin1) useSwap.setState({ coin1: coin1 })
      if (coin2) useSwap.setState({ coin2: coin2 })
    }

    // parse amount
    const coin1Amount = urlCoin1Mint ? urlCoin1Amount : urlCoin2Mint ? urlCoin2Amount : undefined
    const coin2Amount = urlCoin2Mint ? urlCoin2Amount : urlCoin1Mint ? urlCoin1Amount : undefined
    if (coin1Amount) useSwap.setState({ coin1Amount: coin1Amount })
    if (coin2Amount) useSwap.setState({ coin2Amount: coin2Amount })

    // parse fixed side
    const currentFixedSide = swapDirectionReversed
      ? swapFocusSide === 'coin2'
        ? 'in'
        : 'out'
      : swapFocusSide === 'coin2'
      ? 'out'
      : 'in'
    const isUrlFixedSideValid = urlFixedSide === 'in' || urlFixedSide === 'out'
    if (isUrlFixedSideValid && currentFixedSide !== urlFixedSide) {
      const correspondingFocusSide =
        urlFixedSide === 'in' ? (swapDirectionReversed ? 'coin2' : 'coin1') : swapDirectionReversed ? 'coin1' : 'coin2'
      useSwap.setState({ focusSide: correspondingFocusSide })
    }

    // if not load enough data, do not change state
    if (liquidityPoolJsonInfos.length > 0 && Object.values(tokens).length > 0) {
      haveInit.current = true
    }
  }, [pathname, query, getToken, tokens, replace, liquidityPoolJsonInfos, findLiquidityInfoByAmmId])

  //#region ------------------- sync zustand data to url -------------------
  const throttledUpdateUrl = useCallback(
    throttle(
      (pathname: string, query: Record<string, any>) => {
        replace({ pathname, query }, undefined, { shallow: true })
      },
      { delay: 100 }
    ),
    []
  )

  useEffect(() => {
    if (!pathname.includes('/swap')) return
    // console.log('haveInit.current: ', haveInit.current)

    // not in 'affect to url' period
    if (!haveInit.current) return

    // no need to affact change to url if it's  clean-url-mode
    if (inCleanUrlMode) return

    const coin1Mint = swapCoin1 ? toUrlMint(swapCoin1) : ''
    const coin2Mint = swapCoin2 ? toUrlMint(swapCoin2) : ''
    const upCoinMint = swapDirectionReversed ? coin2Mint : coin1Mint
    const downCoinMint = swapDirectionReversed ? coin1Mint : coin2Mint
    const upCoinAmount = swapDirectionReversed ? swapCoin2Amount : swapCoin1Amount
    const downCoinAmount = swapDirectionReversed ? swapCoin1Amount : swapCoin2Amount

    const urlInfo = objectShakeFalsy({
      inputCurrency: String(query.inputCurrency ?? ''),
      outputCurrency: String(query.outputCurrency ?? ''),
      inputAmount: String(query.inputAmount ?? ''),
      outputAmount: String(query.outputAmount ?? ''),
      fixed: String(query.fixed ?? '')
    })

    // attach state to url
    const dataInfo = objectShakeFalsy({
      inputCurrency: upCoinMint,
      outputCurrency: downCoinMint,
      inputAmount: toString(upCoinAmount),
      outputAmount: toString(downCoinAmount),
      fixed: swapDirectionReversed
        ? swapFocusSide === 'coin2'
          ? 'in'
          : 'out'
        : swapFocusSide === 'coin2'
        ? 'out'
        : 'in'
    })
    const urlNeedUpdate = !areShallowEqual(urlInfo, dataInfo)
    if (urlNeedUpdate) throttledUpdateUrl(pathname, dataInfo)
  }, [
    inCleanUrlMode,
    swapCoin1,
    swapCoin2,
    swapCoin1Amount,
    swapCoin2Amount,
    swapDirectionReversed,
    swapFocusSide,
    query,
    replace,
    pathname
  ])
  //#endregion
}
