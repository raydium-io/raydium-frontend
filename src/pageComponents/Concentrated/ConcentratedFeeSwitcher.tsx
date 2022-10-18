import { HydratedAmmV3ConfigInfo, HydratedConcentratedInfo } from '@/application/concentrated/type'
import useConcentrated from '@/application/concentrated/useConcentrated'
import useConcentratedAmmConfigInfoLoader from '@/application/concentrated/useConcentratedAmmConfigInfoLoader'
import useConcentratedAmmSelector from '@/application/concentrated/useConcentratedAmmSelector'
import useConcentratedInfoLoader from '@/application/concentrated/useConcentratedInfoLoader'
import Icon from '@/components/Icon'
import Row from '@/components/Row'
import toPubString from '@/functions/format/toMintString'
import toPercentString from '@/functions/format/toPercentString'
import { isMintEqual } from '@/functions/judgers/areEqual'
import { gte } from '@/functions/numberish/compare'
import { twMerge } from 'tailwind-merge'

export function ConcentratedFeeSwitcher({ className }: { className?: string }) {
  const existAmmPools = useConcentrated((s) => s.selectableAmmPools)
  const currentAmmPool = useConcentrated((s) => s.currentAmmPool)
  const ammConfigFeeOptions = useConcentrated((s) => s.availableAmmConfigFeeOptions)
  const existAmmPoolIds = existAmmPools?.map((p) => toPubString(p.ammConfig.id))
  const unexistAmmPoolConfigIds = ammConfigFeeOptions?.filter((i) => !existAmmPoolIds?.includes(i.id)).map((i) => i.id)

  useConcentratedInfoLoader()
  useConcentratedAmmConfigInfoLoader()
  useConcentratedAmmSelector(true)
  return (
    <ConcentratedFeeSwitcherContent
      configs={ammConfigFeeOptions}
      currentPool={currentAmmPool}
      unavailableIds={unexistAmmPoolConfigIds}
      className={className}
    />
  )
}

function ConcentratedFeeSwitcherContent({
  availableAmmPools,
  configs,
  currentPool,
  unavailableIds,
  className
}: {
  availableAmmPools?: HydratedConcentratedInfo[]
  configs?: HydratedAmmV3ConfigInfo[]
  currentPool?: HydratedConcentratedInfo
  unavailableIds?: string[]
  className?: string
}) {
  const coin1 = useConcentrated((s) => s.coin1)
  const coin2 = useConcentrated((s) => s.coin2)
  return (
    <Row className={twMerge('gap-4', className)}>
      {configs?.map((config) => {
        const isCurrent = isMintEqual(config.id, currentPool?.ammConfig.id)
        const canSelect = coin1 && coin2 && !unavailableIds?.includes(config.id)
        const text = gte(config.tradeFeeRate, 0.0025)
          ? 'Best for most pairs'
          : gte(config.tradeFeeRate, 0.0003)
          ? 'Best for stable pairs'
          : 'Best for stable pairs'
        return (
          <div
            key={config.id}
            className={`relative grow items-stretch p-3 gap-2 ${
              isCurrent ? 'ring-inset ring-1.5 ring-[#abc4ff]' : 'ring-inset ring-1.5 ring-[#abc4ff40]'
            } rounded-xl ${canSelect ? 'clickable-no-transform select-none' : 'opacity-50 pointer-events-none'}`}
            onClick={() => {
              useConcentrated.setState({
                currentAmmPool: availableAmmPools?.find((p) => isMintEqual(p.ammConfig.id, config.id))
              })
            }}
          >
            {isCurrent ? (
              <div className="absolute p-0.5 rounded-full right-1 top-1 -translate-y-1/2 translate-x-1/2 z-10 bg-[#141041] text-[#abc4ff]">
                <Icon heroIconName="check-circle" size="smi" />
              </div>
            ) : null}
            <div className="text-white font-medium">{toPercentString(config.tradeFeeRate, { fixed: 4 })}</div>
            <div className="text-[#abc4ff80] text-xs font-medium">{text}</div>
          </div>
        )
      })}
    </Row>
  )
}
