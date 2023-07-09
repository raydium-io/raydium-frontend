import { useMemo } from 'react'
import { Token } from '@/application/token/type'
import toPubString from '@/functions/format/toMintString'
import useAsyncMemo from '@/hooks/useAsyncMemo'
import { isTransactableToken } from '@/application/token/parseMintInfo'

/**
 *  for component `<Token2022FeeTooHighWarningChip />`
 * @todo should like useToken2022SwapConfirmPanel.tsx
 */
export function useToken2022FeeTooHighWarningChecker<T extends Token | undefined>(coins: T[]) {
  const cointMints = useMemo(() => coins.map((coin) => toPubString(coin?.mint)), [coins])

  const notTransactableToken = useAsyncMemo(
    async () => {
      for (const coin of coins) {
        if (coin) {
          const isTransactable = await isTransactableToken(coin?.mint)
          if (!isTransactable) return coin
        }
      }
    },
    cointMints,
    undefined
  )
  return {
    needOpenWarningChip: coins.every((coin) => coin) && Boolean(notTransactableToken),
    badToken: notTransactableToken
  }
}
