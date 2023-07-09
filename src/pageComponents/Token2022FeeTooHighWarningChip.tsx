import { SplToken } from '@/application/token/type'
import { FadeIn } from '@/components/FadeIn'
import Icon from '@/components/Icon'
import Row from '@/components/Row'

/**
 * alert 100% fee 2022 token can't swap
 */
export function Token2022FeeTooHighWarningChip({ needOpen, badToken }: { needOpen?: boolean; badToken?: SplToken }) {
  return (
    <FadeIn>
      {needOpen && (
        <Row className="mt-5 bg-[#da2eef1a] text-[#da2eef] rounded-xl py-3 px-3 mobile:px-2 items-center">
          <Icon className="mr-1" heroIconName="exclamation-circle" size="smi" />
          <div className="text-xs mobile:text-2xs">
            The coin in amount are all used to cover transaction fee so the transaction can't not be finished.
          </div>
        </Row>
      )}
    </FadeIn>
  )
}
