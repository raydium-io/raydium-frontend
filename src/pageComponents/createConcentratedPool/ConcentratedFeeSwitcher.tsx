import { HydratedAmmV3ConfigInfo } from '@/application/concentrated/type'
import useConcentrated from '@/application/concentrated/useConcentrated'
import useConcentratedInitFeeSelector from '@/application/concentrated/useConcentratedInitFeeSelector'
import Row from '@/components/Row'
import toPubString from '@/functions/format/toMintString'
import toPercentString from '@/functions/format/toPercentString'
import { gte } from '@/functions/numberish/compare'

export function ConcentratedFeeSwitcher({ className }: { className?: string }) {
  const existAmmPools = useConcentrated((s) => s.selectableAmmPools)
  const existAmmPoolConfigIds = existAmmPools?.map((i) => toPubString(i.ammConfig.id))
  const userSelectedAmmConfigFeeOption = useConcentrated((s) => s.userSelectedAmmConfigFeeOption)
  const ammConfigFeeOptions = useConcentrated((s) => s.availableAmmConfigFeeOptions)

  useConcentratedInitFeeSelector()
  return (
    <ConcentratedFeeSwitcherContent
      configs={ammConfigFeeOptions}
      current={userSelectedAmmConfigFeeOption}
      existIds={existAmmPoolConfigIds}
    />
  )
}

function ConcentratedFeeSwitcherContent({
  configs,
  current,
  existIds
}: {
  configs?: HydratedAmmV3ConfigInfo[]
  current?: HydratedAmmV3ConfigInfo
  existIds?: string[]
}) {
  const coin1 = useConcentrated((s) => s.coin1)
  const coin2 = useConcentrated((s) => s.coin2)
  return (
    <Row className="py-4 gap-4">
      {configs?.map((config) => {
        const isCurrent = config.id === current?.id
        const canSelect = coin1 && coin2 && !existIds?.includes(config.id)
        const text = gte(config.tradeFeeRate, 0.0025)
          ? 'Best for most pairs'
          : gte(config.tradeFeeRate, 0.0003)
          ? 'Best for stable pairs'
          : 'Best for stable pairs'
        return (
          <div
            key={config.id}
            className={`growitems-stretch p-3 gap-2 grow  ${
              isCurrent ? 'cyberpunk-border' : 'ring-inset ring-2 ring-[#abc4ff40]'
            } rounded-xl ${canSelect ? 'clickable-no-transform select-none' : 'opacity-50 pointer-events-none'}`}
            onClick={() => {
              useConcentrated.setState({ userSelectedAmmConfigFeeOption: config })
            }}
          >
            <div className="text-white font-medium">{toPercentString(config.tradeFeeRate, { fixed: 4 })}</div>
            <div className="text-[#abc4ff80] text-xs font-medium">{text}</div>
          </div>
        )
      })}
    </Row>
  )
}
