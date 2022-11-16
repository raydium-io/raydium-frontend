import useWallet from '@/application/wallet/useWallet'
import { div } from '@/functions/numberish/operations'
import { gte, lt } from '@/functions/numberish/compare'
import { SOLDecimals, SOL_BASE_BALANCE } from '@/application/token/quantumSOL'
import { toString } from '@/functions/numberish/toString'
import Icon from '@/components/Icon'
import { FadeIn } from '@/components/FadeIn'
import Row from '@/components/Row'
import Tooltip from '@/components/Tooltip'
import { Numberish } from '@/types/constants'
import { twMerge } from 'tailwind-merge'

export function RemainSOLAlert({ solLeastBalance, className }: { solLeastBalance?: Numberish; className?: string }) {
  const rawsolBalance = useWallet((s) => s.solBalance)
  const solBalance = div(rawsolBalance, 10 ** SOLDecimals)

  return (
    <FadeIn>
      {solBalance && lt(solBalance, solLeastBalance ?? SOL_BASE_BALANCE) && gte(solBalance, 0) && (
        <Row className={twMerge('text-sm mt-2 text-[#D8CB39] items-center justify-center', className)}>
          SOL balance: {toString(solBalance)}{' '}
          <Tooltip placement="bottom-right">
            <Icon size="sm" heroIconName="question-mark-circle" className="ml-2 cursor-help" />
            <Tooltip.Panel>
              <p className="w-80">
                {`SOL is needed for Solana network fees. A minimum balance of ${
                  solLeastBalance ?? SOL_BASE_BALANCE
                } SOL is
                recommended to avoid failed transactions. This swap will leave you with less than 
                ${solLeastBalance ?? SOL_BASE_BALANCE} SOL.`}
              </p>
            </Tooltip.Panel>
          </Tooltip>
        </Row>
      )}
    </FadeIn>
  )
}
