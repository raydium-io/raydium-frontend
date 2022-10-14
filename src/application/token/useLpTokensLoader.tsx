import { useEffect } from 'react'

import { Token } from 'test-r-sdk'

import useLiquidity from '@/application/liquidity/useLiquidity'
import { shakeUndifindedItem } from '@/functions/arrayMethods'
import listToMap from '@/functions/format/listToMap'
import toPubString from '@/functions/format/toMintString'
import { lazyMap } from '@/functions/lazyMap'
import useAsyncEffect from '@/hooks/useAsyncEffect'

import { LpToken } from './type'
import useToken from './useToken'

export default function useLpTokensLoader() {
  const ammJsonInfos = useLiquidity((s) => s.jsonInfos)
  const tokens = useToken((s) => s.tokens)
  const userAddedTokens = useToken((s) => s.userAddedTokens)
  const getToken = useToken((s) => s.getToken)

  useAsyncEffect(async () => {
    // console.time('inner') // too slow
    const lpTokenItems = await lazyMap({
      source: ammJsonInfos,
      sourceKey: 'load lp token',
      loopFn: (ammJsonInfo) => {
        // console.time('info') // too slow
        const baseToken = getToken(ammJsonInfo.baseMint) ?? userAddedTokens[ammJsonInfo.baseMint] // depends on raw user Added tokens for avoid re-render
        const quoteToken = getToken(ammJsonInfo.quoteMint) ?? userAddedTokens[ammJsonInfo.quoteMint]
        if (!baseToken || !quoteToken) return // NOTE :  no unknown base/quote lpToken
        // console.time('create lp')
        const lpToken = Object.assign(
          new Token(
            ammJsonInfo.lpMint,
            baseToken.decimals,
            `${baseToken.symbol}-${quoteToken.symbol}`,
            `${baseToken.symbol}-${quoteToken.symbol} LP`
          ),
          {
            isLp: true,
            base: baseToken,
            quote: quoteToken,
            icon: '',
            extensions: {}
          }
        ) as LpToken
        // console.timeEnd('create lp')
        // console.count('info')
        // console.timeEnd('info')
        return lpToken
      }
    })
    // console.timeEnd('inner') // too slow
    const lpTokens = listToMap(shakeUndifindedItem(lpTokenItems), (t) => toPubString(t.mint))
    useToken.setState({ lpTokens, getLpToken: (mint) => lpTokens[toPubString(mint)] })
  }, [ammJsonInfos, tokens, userAddedTokens])
}
