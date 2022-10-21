import Row from '@/components/Row'
import Button from '@/components/Button'
import Icon from '@/components/Icon'
import { twMerge } from 'tailwind-merge'
import { routeTo } from '@/application/routeTools'

export default function NavButtons() {
  return (
    <Row
      className={twMerge(
        '-mt-4 mobile:mt-0.5 mb-8 mobile:mb-2 sticky z-10 -top-4 mobile:top-0 mobile:-translate-y-2 mobile:bg-[#0f0b2f] mobile:hidden items-center justify-between'
      )}
    >
      <Button
        type="text"
        className="text-sm text-[#ABC4FF] opacity-50 px-0"
        prefix={<Icon heroIconName="chevron-left" size="sm" />}
        onClick={() => routeTo('/clmm/pools')}
      >
        Back to Concentrated Pools
      </Button>
    </Row>
  )
}
