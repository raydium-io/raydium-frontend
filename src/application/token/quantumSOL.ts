import { PublicKey } from '@solana/web3.js'

import BN from 'bn.js'
import { Currency, CurrencyAmount, PublicKeyish, Token, TokenAmount, ZERO } from '@raydium-io/raydium-sdk'

import toPubString from '@/functions/format/toMintString'
import { isToken, isTokenAmount } from '@/functions/judgers/dateType'
import { omit } from '@/functions/objectMethods'

import { HydratedTokenJsonInfo, SplToken } from './type'

export const WSOLMint = new PublicKey('So11111111111111111111111111111111111111112')
export const SOLDecimals = 9
export const WSOL = new Token(WSOLMint, SOLDecimals, 'WSOL', 'wrapped solana')
export const SOL = new Currency(SOLDecimals, 'SOL', 'solana')
export const SOL_BASE_BALANCE = '0.05'

//#region ------------------- quantum SOL  -------------------

export interface QuantumSOLJsonInfo extends HydratedTokenJsonInfo {
  isQuantumSOL: true
  collapseTo?: 'sol' | 'wsol'
}

export interface QuantumSOLToken extends SplToken {
  isQuantumSOL: true
  collapseTo?: 'sol' | 'wsol'
}

export interface QuantumSOLAmount extends TokenAmount {
  token: QuantumSOLToken
  solBalance: BN
  wsolBalance: BN
  collapseTo?: 'sol' | 'wsol'
}

export const quantumSOLHydratedTokenJsonInfo: QuantumSOLJsonInfo = {
  isQuantumSOL: true,
  isLp: false,
  official: true,
  mint: toPubString(WSOLMint),
  decimals: SOLDecimals,
  symbol: 'SOL', // QSOL
  id: 'sol',
  name: 'Solana',
  icon: `https://img.raydium.io/icon/So11111111111111111111111111111111111111112.png`,
  extensions: {
    coingeckoId: 'solana'
  }
} as const

export const QuantumSOL = Object.assign(
  new Token(
    quantumSOLHydratedTokenJsonInfo.mint,
    quantumSOLHydratedTokenJsonInfo.decimals,
    quantumSOLHydratedTokenJsonInfo.symbol,
    quantumSOLHydratedTokenJsonInfo.name
  ),
  omit(quantumSOLHydratedTokenJsonInfo, ['mint', 'decimals', 'symbol', 'name'])
) as QuantumSOLToken

export const quantumSOLVersionSOLTokenJsonInfo: QuantumSOLJsonInfo = {
  isQuantumSOL: true,
  isLp: false,
  official: true,
  mint: toPubString(WSOLMint),
  decimals: SOLDecimals,
  collapseTo: 'sol',
  symbol: 'SOL',
  id: 'sol',
  name: 'Solana',
  icon: `https://img.raydium.io/icon/So11111111111111111111111111111111111111112.png`,
  extensions: {
    coingeckoId: 'solana'
  }
} as const

export const QuantumSOLVersionSOL = Object.assign(
  new Token(
    quantumSOLVersionSOLTokenJsonInfo.mint,
    quantumSOLVersionSOLTokenJsonInfo.decimals,
    quantumSOLVersionSOLTokenJsonInfo.symbol,
    quantumSOLVersionSOLTokenJsonInfo.name
  ),
  omit(quantumSOLVersionSOLTokenJsonInfo, ['mint', 'decimals', 'symbol', 'name'])
) as QuantumSOLToken

export const quantumSOLVersionWSOLTokenJsonInfo: QuantumSOLJsonInfo = {
  isQuantumSOL: true,
  isLp: false,
  official: true,
  mint: toPubString(WSOLMint),
  decimals: SOLDecimals,
  collapseTo: 'wsol',
  symbol: 'WSOL',
  id: toPubString(WSOLMint),
  name: 'Wrapped SOL',
  icon: `https://img.raydium.io/icon/So11111111111111111111111111111111111111112.png`,
  extensions: {
    coingeckoId: 'solana'
  }
} as const

export const QuantumSOLVersionWSOL = Object.assign(
  new Token(
    quantumSOLVersionWSOLTokenJsonInfo.mint,
    quantumSOLVersionWSOLTokenJsonInfo.decimals,
    quantumSOLVersionWSOLTokenJsonInfo.symbol,
    quantumSOLVersionWSOLTokenJsonInfo.name
  ),
  omit(quantumSOLVersionWSOLTokenJsonInfo, ['mint', 'decimals', 'symbol', 'name'])
) as QuantumSOLToken

export const toQuantumSolAmount = ({
  solRawAmount: solRawAmount,
  wsolRawAmount: wsolRawAmount
}: {
  solRawAmount?: BN
  wsolRawAmount?: BN
}): QuantumSOLAmount => {
  const quantumSol =
    wsolRawAmount && !solRawAmount
      ? QuantumSOLVersionWSOL
      : !wsolRawAmount && solRawAmount
      ? QuantumSOLVersionSOL
      : QuantumSOL
  const tempTokenAmount = new TokenAmount(quantumSol, solRawAmount ?? wsolRawAmount ?? ZERO)
  // @ts-expect-error force
  return Object.assign(tempTokenAmount, { solBalance: solRawAmount, wsolBalance: wsolRawAmount })
}

export const collapseQuantumSol = (collapseTo: QuantumSOLToken['collapseTo']) =>
  collapseTo === 'sol' ? QuantumSOLVersionSOL : QuantumSOLVersionWSOL

// @ts-expect-error no need to worry about type guard's type here
export const isQuantumSOL: (token: any) => token is QuantumSOLToken = (token) => {
  try {
    return 'isQuantumSOL' in (token as QuantumSOLToken)
  } catch {
    return false
  }
}

export const isQuantumSOLVersionWSOL = (token: any) => isQuantumSOL(token) && token.collapseTo === 'wsol'

export const isQuantumSOLVersionSOL = (token: any) => isQuantumSOL(token) && token.collapseTo === 'sol'

// @ts-expect-error no need to worry about type guard's type here
export const isQuantumSOLAmount: (tokenAmount: TokenAmount) => tokenAmount is QuantumSOLAmount = (tokenAmount) =>
  isQuantumSOL(tokenAmount.token)

//#endregion

//#region ------------------- SDK instruction SOL  -------------------
/** transaction for SDK: unWrap  may QuantumSOL to TokenAmount or CurrencyAmount */
export function deUITokenAmount(tokenAmount: TokenAmount): TokenAmount | CurrencyAmount {
  if (isQuantumSOLAmount(tokenAmount)) {
    if (tokenAmount.token.collapseTo === 'wsol') {
      return new TokenAmount(WSOL, tokenAmount.wsolBalance ?? ZERO) // which means error appears
    } else {
      return new CurrencyAmount(SOL, tokenAmount.solBalance ?? ZERO) // which means error appears
    }
  }
  return tokenAmount
}

/** transaction for SDK: unWrap may QuantumSOL to Token or Currency */
export function deUIToken(token: Token): Token | Currency {
  if (isQuantumSOL(token)) {
    return token.collapseTo === 'wsol' ? WSOL : SOL
  }
  return token
}

export const SOLUrlMint = 'sol'

export function toDataMint(mintlike: PublicKeyish | undefined): string {
  return String(mintlike) === SOLUrlMint ? String(WSOLMint) : String(mintlike ?? '')
}

/** transaction: wrap NativeSOL(real) to QuantumSOL */
export function toUITokenAmount(tokenAmount: TokenAmount | CurrencyAmount): TokenAmount {
  if (isTokenAmount(tokenAmount)) {
    if (String(WSOL) === String(tokenAmount.token.mint)) {
      return toQuantumSolAmount({ wsolRawAmount: tokenAmount.raw })
    } else {
      return tokenAmount
    }
  } else {
    // CurrencyAmount must be SOL
    return toQuantumSolAmount({ solRawAmount: tokenAmount.raw })
  }
}

/** transaction: wrap NativeSOL(real) to SOL(convenient for ui) */
export function toUIToken(token: Token | Currency): Token {
  if (isToken(token)) {
    if (String(WSOL) === String(token.mint)) {
      return QuantumSOLVersionWSOL
    } else {
      return token
    }
  } else {
    // CurrencyAmount must be SOL
    return QuantumSOLVersionSOL
  }
}

//#endregion
