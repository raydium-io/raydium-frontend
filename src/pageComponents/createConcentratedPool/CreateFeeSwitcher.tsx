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
    <Row className={twMerge('gap-4', className)}>
      {configs?.map((config) => {
        const isCurrent = config.id === current?.id
        const canSelect = coin1 && coin2 && !existIds?.includes(config.id)
        const text = [
          { value: 0.0001, description: 'Best for very stable pairs' },
          { value: 0.0005, description: 'Best for stable pairs' },
          { value: 0.0025, description: 'Best for most pairs' },
          { value: 0.01, description: 'Best for exotic pairs' }
        ]
        return (
          <div
            key={config.id}
            className={`relative grow items-stretch p-3 gap-2 ${
              isCurrent ? 'cyberpunk-border' : 'ring-inset ring-2 ring-[#abc4ff40]'
            } rounded-xl ${canSelect ? 'clickable-no-transform select-none' : 'opacity-50 pointer-events-none'}`}
            onClick={() => {
              useConcentrated.setState({ userSelectedAmmConfigFeeOption: config })
            }}
          >
            {isCurrent ? (
              <div
                className="absolute p-0.5 rounded-full right-2 top-2 -translate-y-1/2 translate-x-1/2 z-10"
                style={{
                  background: 'linear-gradient(246deg, #da2eef 7.97%, #2b6aff 49.17%, #39d0d8 92.1%) border-box'
                }}
              >
                <Icon heroIconName="check-circle" size="smi" />
              </div>
            ) : null}
            <div className="text-white font-medium">{toPercentString(config.tradeFeeRate, { fixed: 4 })}</div>
            <div className="text-[#abc4ff80] text-xs font-medium">
              {text.find(({ value }) => gte(config.tradeFeeRate, value))?.description}
            </div>
          </div>
        )
      })}
    </Row>
  )
}
