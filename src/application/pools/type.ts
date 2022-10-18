import { CurrencyAmount, Fraction, Price, Token, TokenAmount } from 'test-r-sdk'

import { HexAddress } from '@/types/constants'

import { SplToken } from '../token/type'

export interface JsonPairItemInfo {
  ammId: HexAddress
  apr24h: number
  apr7d: number
  apr30d: number
  fee7d: number
  fee7dQuote: number
  fee24h: number
  fee24hQuote: number
  fee30d: number
  fee30dQuote: number
  liquidity: number
  lpMint: HexAddress
  lpPrice: number | null // lp price directly. (No need to mandually calculate it from liquidity list)
  market: HexAddress
  name: string
  official: boolean
  price: number // swap price forwrard. for example, if pairId is 'ETH-USDC', price is xxx USDC/ETH
  tokenAmountCoin: number
  tokenAmountLp: number
  tokenAmountPc: number
  volume7d: number
  volume7dQuote: number
  volume24h: number
  volume24hQuote: number
  volume30d: number
  volume30dQuote: number
}

export interface HydratedPairItemInfo {
  ammId: HexAddress
  apr24h: number
  apr7d: number
  apr30d: number
  fee7d: CurrencyAmount // usd
  fee7dQuote: CurrencyAmount // usd
  fee24h: CurrencyAmount // usd
  fee24hQuote: CurrencyAmount // usd
  fee30d: CurrencyAmount // usd
  fee30dQuote: CurrencyAmount // usd
  liquidity: CurrencyAmount // usd
  lpMint: HexAddress
  market: HexAddress
  name: string
  official: boolean

  tokenAmountBase: TokenAmount | null // renameFrom: tokenAmountCoin. if unknown token, return null
  tokenAmountLp: TokenAmount | null // renameFrom: tokenAmountLp. if unknown token, return null
  tokenAmountQuote: TokenAmount | null // renameFrom: tokenAmountPc. if unknown token, return null

  volume7d: CurrencyAmount // usd
  volume7dQuote: CurrencyAmount // usd
  volume24h: CurrencyAmount // usd
  volume24hQuote: CurrencyAmount // usd
  volume30d: CurrencyAmount // usd
  volume30dQuote: CurrencyAmount // usd

  lpPrice: Price | null
  price: Price | null

  // customized

  lp?: SplToken
  base?: SplToken
  quote?: SplToken

  basePooled: TokenAmount | undefined // user's wallet must has pool's lp
  quotePooled: TokenAmount | undefined // user's wallet must has pool's lp
  sharePercent: Fraction | undefined // user's wallet must has pool's lp

  isStablePool: boolean
}
