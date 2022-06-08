import useLiquidity from '@/application/liquidity/useLiquidity'
import { shakeUndifindedItem } from '@/functions/arrayMethods'
import listToMap from '@/functions/format/listToMap'
import toPubString from '@/functions/format/toMintString'
import { Token } from '@raydium-io/raydium-sdk'
import { useEffect } from 'react'
import { LpToken } from './type'
import useToken from './useToken'

export default function useLpTokensLoader() {
  const ammJsonInfos = useLiquidity((s) => s.jsonInfos)
  const tokens = useToken((s) => s.tokens)
  const getToken = useToken((s) => s.getToken)

  useEffect(() => {
    const lpTokens = listToMap(
      shakeUndifindedItem(
        ammJsonInfos.map((ammJsonInfo) => {
          const baseToken = getToken(ammJsonInfo.baseMint)
          const quoteToken = getToken(ammJsonInfo.quoteMint)
          if (!baseToken || !quoteToken) return // NOTE :  no unknown base/quote lpToken
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
          return lpToken
        })
      ),
      (t) => toPubString(t.mint)
    )
    useToken.setState({ lpTokens, getLpToken: (mint) => lpTokens[toPubString(mint)] })
  }, [ammJsonInfos, tokens])
}
