import { useRouter } from 'next/router'

import { TOKEN_PROGRAM_ID, Token } from '@raydium-io/raydium-sdk'

import useLiquidity from '@/application/liquidity/useLiquidity'
import { shakeUndifindedItem } from '@/functions/arrayMethods'
import listToMap from '@/functions/format/listToMap'
import toPubString from '@/functions/format/toMintString'
import { lazyMap } from '@/functions/lazyMap'
import useAsyncEffect from '@/hooks/useAsyncEffect'

import { LpToken, SplToken } from './type'
import useToken from './useToken'

export default function useLpTokensLoader() {
  const ammJsonInfos = useLiquidity((s) => s.jsonInfos)
  const userAddedTokens = useToken((s) => s.userAddedTokens)
  const { getToken } = useToken.getState()
  const tokens = useToken((s) => s.tokens)
  const { pathname } = useRouter()

  useAsyncEffect(async () => {
    const lpTokenItems = await lazyMap({
      source: ammJsonInfos,
      loopTaskName: 'load lp token',
      method: 'hurrier-settimeout',
      options: { oneGroupTasksSize: 80, priority: 1 },
      loopFn: (ammJsonInfo) => {
        const baseToken = getToken(ammJsonInfo.baseMint) ?? userAddedTokens[ammJsonInfo.baseMint] // depends on raw user Added tokens for avoid re-render
        const quoteToken = getToken(ammJsonInfo.quoteMint) ?? userAddedTokens[ammJsonInfo.quoteMint]
        if (!baseToken || !quoteToken) return // NOTE :  no unknown base/quote lpToken
        // console.time('create lp')
        const lpToken = Object.assign(
          new Token(
            TOKEN_PROGRAM_ID, // ! 🚨 in future, lp mint maybe token2022 or maybe not
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
        return lpToken
      }
    })
    const lpTokens = listToMap(shakeUndifindedItem(lpTokenItems), (t) => toPubString(t.mint))
    const sameAsPrevious =
      useToken.getState().lpTokens && toTokenKeys(useToken.getState().lpTokens) == toTokenKeys(lpTokens)
    if (Object.values(lpTokens).length < 1 || sameAsPrevious) return
    useToken.setState((s) => ({ lpTokens, getLpToken: s.getLpToken.bind(undefined) }))
  }, [ammJsonInfos, tokens, userAddedTokens])
}

function toTokenKeys(tokens: Record<string, SplToken>): string {
  return Object.keys(tokens)
    .map((k) => k.slice(0, 2))
    .join(',')
}
