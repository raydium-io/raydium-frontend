import { isTransactableToken } from '@/application/token/parseMintInfo'
import { Token } from '@/application/token/type'
import FadeInStable from '@/components/FadeIn'
import Icon from '@/components/Icon'
import Row from '@/components/Row'
import toPubString from '@/functions/format/toMintString'
import useAsyncMemo from '@/hooks/useAsyncMemo'
import { useMemo } from 'react'

/**
 *  token 2022 transfer fee is 100%
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

  const hasNotTransableToken = Boolean(notTransactableToken)

  const WarningChip = ({ className }: { className?: string }) => (
    <Token2022FeeTooHighWarningChip
      className={className}
      needOpen={hasNotTransableToken}
      badToken={notTransactableToken}
    />
  )

  return {
    isWarningChipOpen: hasNotTransableToken,
    badToken: notTransactableToken,
    Token2022FeeTooHighWarningChip: WarningChip
  }
}

/**
 * alert 100% fee 2022 token can't swap
 */
function Token2022FeeTooHighWarningChip({
  className,
  needOpen,
  badToken
}: {
  className?: string
  needOpen?: boolean
  badToken?: Token
}) {
  return (
    <FadeInStable show={needOpen}>
      <div className={className}>
        <Row className="bg-[#da2eef1a] text-[#da2eef] rounded-xl py-3 px-3 mobile:px-2 items-center">
          <Icon className="mr-1" heroIconName="exclamation-circle" size="smi" />
          <div className="text-xs mobile:text-2xs">Transfer fee at 100%, transaction will fail.</div>
        </Row>
      </div>
    </FadeInStable>
  )
}
