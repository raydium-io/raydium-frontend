import { useEffect, useMemo } from 'react'
import { useRouter } from 'next/router'

import { Price, TokenAmount } from '@raydium-io/raydium-sdk'

import shallow from 'zustand/shallow'

import jFetch from '@/functions/dom/jFetch'
import { toTokenAmount } from '@/functions/format/toTokenAmount'
import toTokenPrice from '@/functions/format/toTokenPrice'
import toUsdCurrency from '@/functions/format/toUsdCurrency'
import { HexAddress } from '@/types/constants'

import useToken from '../token/useToken'
import useWallet from '../wallet/useWallet'

import computeUserLedgerInfo from './infoCalculater'
import { HydratedPoolItemInfo, JsonPairItemInfo } from './type'
import { usePools } from './usePools'
import useLiquidity from '../liquidity/useLiquidity'
import listToMap from '@/functions/format/listToMap'
import toPubString from '@/functions/format/toMintString'
import { shakeUndifindedItem } from '@/functions/arrayMethods'
import { useEffectWithTransition } from '@/hooks/useEffectWithTransition'

export default function usePoolsInfoLoader() {
  const jsonInfo = usePools((s) => s.jsonInfos, shallow)
  const liquidityJsonInfos = useLiquidity((s) => s.jsonInfos)
  const liquidityJsonInfosMap = useMemo(
    () => listToMap(liquidityJsonInfos, (i) => toPubString(i.lpMint)),
    [liquidityJsonInfos]
  )

  const getToken = useToken((s) => s.getToken)
  const tokens = useToken((s) => s.tokens)
  const getLpToken = useToken((s) => s.getLpToken)
  const lpTokens = useToken((s) => s.lpTokens)
  const balances = useWallet((s) => s.balances)
  const { pathname } = useRouter()
  const refreshCount = usePools((s) => s.refreshCount)

  const fetchPairs = async () => {
    const pairJsonInfo = await jFetch<JsonPairItemInfo[]>('https://api.raydium.io/v2/main/pairs', {
      ignoreCache: true
    })
    if (!pairJsonInfo) return

    // eslint-disable-next-line no-console
    console.assert(Array.isArray(pairJsonInfo), pairJsonInfo)
    const filtered = pairJsonInfo.filter(({ name }) => !name.includes('unknown'))
    usePools.setState({ jsonInfos: filtered })
  }

  useEffectWithTransition(() => {
    fetchPairs()
  }, [refreshCount])

  // TODO: currently also fetch info when it's not
  useEffectWithTransition(() => {
    if (!pathname.includes('/pools/') && !pathname.includes('/liquidity/')) return
    const timeoutId = setInterval(usePools.getState().refreshPools, 15 * 60 * 1000)
    return () => clearInterval(timeoutId)
  }, [pathname])

  const lpPrices = useMemo<Record<HexAddress, Price>>(
    () =>
      Object.fromEntries(
        jsonInfo
          .map((value) => {
            const token = lpTokens[value.lpMint]
            const price = token && value.lpPrice ? toTokenPrice(token, value.lpPrice, { alreadyDecimaled: true }) : null
            return [value.lpMint, price]
          })
          .filter(([lpMint, price]) => lpMint != null && price != null)
      ),
    [jsonInfo, lpTokens]
  )

  useEffect(() => {
    usePools.setState({ lpPrices })
  }, [lpPrices])

  useEffectWithTransition(() => {
    const hydratedInfos = shakeUndifindedItem(
      jsonInfo.map((pair) => {
        try {
          const lpMint = pair.lpMint
          const lp = getLpToken(lpMint)
          const base = lp?.base
          const quote = lp?.quote

          // console.log(lp?.symbol, lp)
          const tokenAmountBase = base
            ? toTokenAmount(base, pair.tokenAmountCoin, { alreadyDecimaled: true }) ?? null
            : null
          const tokenAmountQuote = quote
            ? toTokenAmount(quote, pair.tokenAmountPc, { alreadyDecimaled: true }) ?? null
            : null
          const tokenAmountLp = lp ? toTokenAmount(lp, pair.tokenAmountLp, { alreadyDecimaled: true }) ?? null : null

          const lpBalance: TokenAmount | undefined = balances[String(lpMint)]
          const calcLpUserLedgerInfoResult = computeUserLedgerInfo(
            { tokenAmountBase, tokenAmountQuote, tokenAmountLp },
            { lpToken: lp, baseToken: base, quoteToken: quote, lpBalance }
          )

          return {
            ...pair,
            ...{
              fee7d: toUsdCurrency(pair.fee7d),
              fee7dQuote: toUsdCurrency(pair.fee7dQuote),
              fee24h: toUsdCurrency(pair.fee24h),
              fee24hQuote: toUsdCurrency(pair.fee24hQuote),
              fee30d: toUsdCurrency(pair.fee30d),
              fee30dQuote: toUsdCurrency(pair.fee30dQuote),

              volume24h: toUsdCurrency(pair.volume24h),
              volume24hQuote: toUsdCurrency(pair.volume24hQuote),
              volume7d: toUsdCurrency(pair.volume7d),
              volume7dQuote: toUsdCurrency(pair.volume7dQuote),
              volume30d: toUsdCurrency(pair.volume30d),
              volume30dQuote: toUsdCurrency(pair.volume30dQuote),

              tokenAmountBase,
              tokenAmountQuote,
              tokenAmountLp,

              liquidity: toUsdCurrency(pair.liquidity),
              lpPrice: lp && pair.lpPrice ? toTokenPrice(lp, pair.lpPrice) : null,

              // customized
              lp,
              base,
              quote,

              basePooled: calcLpUserLedgerInfoResult?.basePooled,
              quotePooled: calcLpUserLedgerInfoResult?.quotePooled,
              sharePercent: calcLpUserLedgerInfoResult?.sharePercent,

              price: base ? toTokenPrice(base, pair.price) : null,

              isStablePool: Boolean(
                lp && liquidityJsonInfos?.find((i) => i.lpMint === toPubString(lp.mint))?.version === 5
              )
            }
          }
        } catch (e) {
          console.error(e)
          return undefined
        }
      })
    )
    usePools.setState({ hydratedInfos, loading: hydratedInfos.length === 0 })
  }, [jsonInfo, getToken, balances, lpTokens, tokens, liquidityJsonInfosMap])
}
