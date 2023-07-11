import { isTransactableToken } from '@/application/token/parseMintInfo'
import { Token } from '@/application/token/type'
import FadeInStable from '@/components/FadeIn'
import Icon from '@/components/Icon'
import Row from '@/components/Row'
import toPubString from '@/functions/format/toMintString'
import { toString } from '@/functions/numberish/toString'
import useAsyncMemo from '@/hooks/useAsyncMemo'
import { Numberish } from '@/types/constants'
import { useMemo } from 'react'

/**
 *  token 2022 transfer fee is 100%
 */
export function useToken2022FeeTooHighWarningChecker(
  checkTargets: {
    token?: Token
    amount?: Numberish
  }[]
) {
  const mints = useMemo(() => checkTargets.map((target) => toPubString(target.token?.mint)), [checkTargets])
  const amounts = useMemo(() => checkTargets.map((target) => toString(target.amount)), [checkTargets])
  const notTransactableToken = useAsyncMemo(
    async () => {
      for (const { token, amount: userInputAmount } of checkTargets) {
        if (token) {
          const isTransactable = await isTransactableToken(token.mint, userInputAmount)
          if (!isTransactable) return token
        }
      }
    },
    mints.concat(amounts),
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
