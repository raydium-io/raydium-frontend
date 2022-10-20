import { HydratedAmmV3ConfigInfo } from '@/application/concentrated/type'
import useConcentrated from '@/application/concentrated/useConcentrated'
import useConcentratedAmmConfigInfoLoader from '@/application/concentrated/useConcentratedAmmConfigInfoLoader'
import useConcentratedAmmSelector from '@/application/concentrated/useConcentratedAmmSelector'
import useConcentratedInfoLoader from '@/application/concentrated/useConcentratedInfoLoader'
import useConcentratedCreateInitFeeSelector from '@/application/concentrated/useConcentratedCreateInitFeeSelector'
import Icon from '@/components/Icon'
import Row from '@/components/Row'
import toPubString from '@/functions/format/toMintString'
import toPercentString from '@/functions/format/toPercentString'
import { gte } from '@/functions/numberish/compare'
import { twMerge } from 'tailwind-merge'

export function CreateFeeSwitcher({ className }: { className?: string }) {
  const existAmmPools = useConcentrated((s) => s.selectableAmmPools)
  const existAmmPoolConfigIds = existAmmPools?.map((i) => toPubString(i.ammConfig.id))
  const userSelectedAmmConfigFeeOption = useConcentrated((s) => s.userSelectedAmmConfigFeeOption)
  const ammConfigFeeOptions = useConcentrated((s) => s.availableAmmConfigFeeOptions)

  useConcentratedInfoLoader()
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
  configs?: HydratedAmmV3ConfigInfo[]
  current?: HydratedAmmV3ConfigInfo
  existIds?: string[]
  className?: string
}) {
  const coin1 = useConcentrated((s) => s.coin1)
  const coin2 = useConcentrated((s) => s.coin2)
  return (
    <Row className={twMerge('gap-2', className)}>
      {configs?.map((config) => {
        const isCurrent = config.id === current?.id
        const canSelect = coin1 && coin2 && !existIds?.includes(config.id)
        const text = [
          { value: 0.01, description: 'Best for exotic pairs' },
          { value: 0.0025, description: 'Best for most pairs' },
          { value: 0.0005, description: 'Best for stable pairs' },
          { value: 0.0001, description: 'Best for very stable pairs' }
        ]
        return (
          <div
            key={config.id}
            className={`relative grow items-stretch px-1.5 py-2 ${
              isCurrent ? 'ring-inset ring-1.5 ring-[#abc4ff]' : 'ring-inset ring-1.5 ring-[#abc4ff40]'
            } rounded-xl ${canSelect ? 'clickable-no-transform select-none' : 'opacity-50 pointer-events-none'}`}
            onClick={() => {
              useConcentrated.setState({ userSelectedAmmConfigFeeOption: config })
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
            <div className="text-[#abc4ff80] text-xs">
              {text.find(({ value }) => gte(config.tradeFeeRate, value))?.description}
            </div>
          </div>
        )
      })}
    </Row>
  )
}
