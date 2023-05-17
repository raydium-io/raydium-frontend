import { PublicKeyish } from '@raydium-io/raydium-sdk'
import toPubString from '@/functions/format/toMintString'
import useToken from './useToken'
import { setMinus } from '@/functions/setMethods'
import { useEffect, useMemo } from 'react'
import { useEvent } from '@/hooks/useEvent'

/**
 * it must be a hooks, otherwise it will travel token list every time
 */
export function useTokenListSettingsUtils(): {
  isTokenUnnamed: (tokenMint: PublicKeyish) => boolean
  isTokenUnnamedAndNotUserCustomized: (tokenMint: PublicKeyish) => boolean
} {
  const tokenListSettings = useToken((s) => s.tokenListSettings)
  const tokenJsonInfos = useToken((s) => s.tokenJsonInfos)
  const blacklist = useToken((s) => s.blacklist)

  const officialTokenMints = tokenListSettings['Raydium Token List'].mints
  const unofficialTokenMints = tokenListSettings['Solana Token List'].mints
  const userTokenMints = tokenListSettings['User Added Token List'].mints

  // all token that is has no build-in symbol, that it's symbol temporary
  const otherLiquidityComposedTokenMints = useMemo(
    () => setMinus(Object.keys(tokenJsonInfos), officialTokenMints, unofficialTokenMints, blacklist),
    [Object.keys(tokenJsonInfos).length, officialTokenMints?.size, unofficialTokenMints?.size, blacklist.length]
  )

  // all token that is has no build-in symbol, that it's symbol temporary
  const otherLiquidityComposedTokenMintsWithoutUserCustomized = useMemo(
    () => setMinus(otherLiquidityComposedTokenMints, userTokenMints),
    [otherLiquidityComposedTokenMints.size, userTokenMints?.size]
  )

  const isTokenUnnamed = useEvent((tokenMint: PublicKeyish) => {
    return otherLiquidityComposedTokenMints.has(toPubString(tokenMint))
  })

  const isTokenUnnamedAndNotUserCustomized = useEvent((tokenMint: PublicKeyish) => {
    return otherLiquidityComposedTokenMintsWithoutUserCustomized.has(toPubString(tokenMint))
  })

  return {
    isTokenUnnamed,
    isTokenUnnamedAndNotUserCustomized
  }
}
