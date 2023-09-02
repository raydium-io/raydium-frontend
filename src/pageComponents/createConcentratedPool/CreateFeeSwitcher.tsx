import { HydratedClmmConfigInfo } from '@/application/concentrated/type'
import useConcentrated from '@/application/concentrated/useConcentrated'
import useConcentratedAmmConfigInfoLoader from '@/application/concentrated/useConcentratedAmmConfigInfoLoader'
import useConcentratedAmmSelector from '@/application/concentrated/useConcentratedAmmSelector'
import useConcentratedCreateInitFeeSelector from '@/application/concentrated/useConcentratedCreateInitFeeSelector'
import Icon from '@/components/Icon'
import Row from '@/components/Row'
import Tooltip from '@/components/Tooltip'
import toPubString from '@/functions/format/toMintString'
import toPercentString from '@/functions/format/toPercentString'
import { twMerge } from 'tailwind-merge'

export function CreateFeeSwitcher({ className }: { className?: string }) {
  const existAmmPools = useConcentrated((s) => s.selectableAmmPools)
  const existAmmPoolConfigIds = existAmmPools?.map((i) => toPubString(i.ammConfig.id))
  const userSelectedAmmConfigFeeOption = useConcentrated((s) => s.userSelectedAmmConfigFeeOption)
  const ammConfigFeeOptions = useConcentrated((s) => s.availableAmmConfigFeeOptions)

  useConcentratedAmmConfigInfoLoader()
  useConcentratedAmmSelector(true)
  useConcentratedCreateInitFeeSelector()
  return (
    <CreateFeeSwitcherContent
      configs={ammConfigFeeOptions}
      current={userSelectedAmmConfigFeeOption}
      existIds={existAmmPoolConfigIds}
      className={className}
    />
  )
}

function CreateFeeSwitcherContent({
  configs,
  current,
  existIds,
  className
}: {
  configs?: HydratedClmmConfigInfo[]
  current?: HydratedClmmConfigInfo
  existIds?: string[]
  className?: string
}) {
  const coin1 = useConcentrated((s) => s.coin1)
  const coin2 = useConcentrated((s) => s.coin2)
  return (
    <Row className={twMerge('gap-2 item-grow', className)}>
      {configs?.map((config) => {
        const isCurrent = config.id === current?.id
        const isAlreadyCreated = existIds?.includes(config.id)
        const canSelect = coin1 && coin2 && !isAlreadyCreated
        return (
          <Tooltip className="grow" key={config.id} disable={!isAlreadyCreated}>
            <div
              className={`relative grow items-stretch px-1.5 py-2 ${
                isCurrent ? 'ring-inset ring-1.5 ring-[#abc4ff]' : 'ring-inset ring-1.5 ring-[#abc4ff60]'
              } rounded-xl ${canSelect ? 'clickable-no-transform select-none' : 'opacity-30 cursor-not-allowed'}`}
              onClick={() => {
                if (canSelect) useConcentrated.setState({ userSelectedAmmConfigFeeOption: config })
              }}
            >
              {isCurrent ? (
                <div className="absolute p-0.5 rounded-full right-1 top-1 -translate-y-1/2 translate-x-1/2 z-10 text-[#abc4ff] bg-[#18225d]">
                  <Icon heroIconName="check-circle" size="smi" />
                </div>
              ) : null}
              <div className="text-white font-medium text-sm mb-2">
                {toPercentString(config.tradeFeeRate, { fixed: 4 })}
              </div>
              <div className="text-[#abc4ff80] text-xs">{config.description}</div>
            </div>
            <Tooltip.Panel>Already created</Tooltip.Panel>
          </Tooltip>
        )
      })}
    </Row>
  )
}
