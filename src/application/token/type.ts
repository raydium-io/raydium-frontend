import { SplTokenJsonInfo, Token } from '@raydium-io/raydium-sdk'

import { HexAddress, SrcAddress } from '@/types/constants'

export interface TokenJson {
  symbol: string
  name: string
  mint: HexAddress
  decimals: number
  extensions: {
    coingeckoId?: string
  }
  icon: string
}

export type SplToken = Token & {
  icon: SrcAddress
  extensions: {
    [key in 'coingeckoId' | 'website' | 'whitepaper']?: string
  }
}

export type LpToken = Token & {
  isLp: true
  base: SplToken
  quote: SplToken
  icon: SrcAddress
  extensions: {
    [key in 'coingeckoId' | 'website' | 'whitepaper']?: string
  }
}

export interface HydratedTokenJsonInfo {
  mint: string
  symbol: string
  decimals: number
  name: string

  isLp: boolean
  official: boolean
  base?: Token
  quote?: Token
  icon: SrcAddress
  extensions: {
    [key in 'coingeckoId' | 'website' | 'whitepaper']?: string
  }
}

export interface RaydiumTokenListJsonInfo {
  name: string
  timestamp: string
  version: { major: number; minor: number; patch: number }
  official: TokenJson[]
  unOfficial: TokenJson[]
  blacklist: HexAddress[]
}

export interface RaydiumDevTokenListJsonInfo {
  name: string
  timestamp: string
  tokens: TokenJson[]
}

export interface TokenList {
  url: SrcAddress
  name: string
  timestamp: string
  tokens: TokenJson[]
}

export interface TokenListFetchConfigItem {
  url: SrcAddress
  name: string
}

export interface TokenListFetchConfigItemWithMethods {
  url: SrcAddress
  name: string
}

export { Token, TokenAmount } from '@raydium-io/raydium-sdk'
