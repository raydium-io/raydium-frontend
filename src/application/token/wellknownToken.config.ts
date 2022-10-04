import toPubString, { toPub } from '@/functions/format/toMintString'
import { PublicKey } from '@solana/web3.js'
import { WSOLMint } from './quantumSOL'

export const RAYMint = toPub('4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R')
export const PAIMint = toPub('Ea5SjE2Y6yvCeW5dYTn7PYMuW5ikXkvbGdcmSnXeaLjS')
export const SRMMint = toPub('SRMuApVNdxXokk5GT7XD5cUUgXMBCoAz2LHeuAoKWRt')
export const USDCMint = toPub('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v')
export const USDTMint = toPub('Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB')
export const mSOLMint = toPub('mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So')
export const stSOLMint = toPub('7dHbWXmci3dT8UFYWYZweBLXgycu7Y3iL6trKn1Y7ARj')
export const USDHMint = toPub('USDH1SM1ojwWUga67PGrgFWUHibbjqMvuMaDkRJTgkX')
export const NRVMint = toPub('NRVwhjBQiUPYtfDT5zRBVJajzFQHaBUNtC7SNVvqRFa')
export const ANAMint = toPub('ANAxByE6G2WjFp7A4NqtWYXb3mgruyzZYg3spfxe6Lbo')
export const ETHMint = toPub('7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs')
export const USHMint = toPub('9iLH8T7zoWhY7sBmj1WK9ENbWdS1nL8n9wAxaeRitTa6')

export const SOLMint = PublicKey.default

export const routeMiddleMints = {
  //TODO: actually just use getToken() is ok, this structure is build when getToken() is not ready
  USDT: toPubString(USDTMint),
  USDC: toPubString(USDCMint),
  RAY: toPubString(RAYMint),
  WSOL: toPubString(WSOLMint),
  SRM: toPubString(SRMMint),
  PAI: toPubString(PAIMint),
  mSOL: toPubString(mSOLMint),
  stSOL: toPubString(stSOLMint),
  USDH: toPubString(USDHMint),
  // NRV: toPubString(NRVMint),
  // ANA: toPubString(ANAMint),
  ETH: toPubString(ETHMint),
  USH: toPubString(USHMint)
}
