import { HydratedAmmV3ConfigInfo } from '@/application/concentrated/type'
import useConcentrated from '@/application/concentrated/useConcentrated'
import Col from '@/components/Col'
import Collapse from '@/components/Collapse'
import Grid from '@/components/Grid'
import Icon from '@/components/Icon'
import Row from '@/components/Row'
import toPubString from '@/functions/format/toMintString'
import toPercentString from '@/functions/format/toPercentString'
import { twMerge } from 'tailwind-merge'

export function ConcentratedFeeSwitcher({ className }: { className?: string }) {
  const selectableAmmPools = useConcentrated((s) => s.selectableAmmPools)
  const selectableAmmPoolIds = selectableAmmPools?.map((i) => toPubString(i.id))
  const userSelectedAmmConfigFeeOption = useConcentrated((s) => s.userSelectedAmmConfigFeeOption)
  const availableAmmConfigFeeOptions = useConcentrated((s) => s.availableAmmConfigFeeOptions)
  return (
    <Collapse className={twMerge('bg-[#141041] rounded-xl', className)}>
      <Collapse.Face>
        {(open) => <ConcentratedFeeSwitcherFace open={open} currentConfig={userSelectedAmmConfigFeeOption} />}
      </Collapse.Face>
      <Collapse.Body>
        <ConcentratedFeeSwitcherContent
          configs={availableAmmConfigFeeOptions}
          current={userSelectedAmmConfigFeeOption}
          existIds={selectableAmmPoolIds}
        />
      </Collapse.Body>
    </Collapse>
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
  return (
    <Row className="p-4 gap-4">
      {configs?.map((config) => {
        const isCurrent = config.id === current?.id
        const canSelect = !existIds?.includes(config.id)
        return (
          <div
            key={config.id}
            className={`grow p-5 mobile:py-4 mobile:px-5 gap-2 items-stretch ring-inset ring-1.5 ${
              isCurrent ? 'ring-[#39d0d8]' : 'ring-[#abc4ff80]'
            } rounded-xl ${canSelect ? 'clickable select-none' : 'opacity-50 pointer-events-none'}`}
            onClick={() => {
              useConcentrated.setState({ userSelectedAmmConfigFeeOption: config })
            }}
          >
            <Col className="gap-4">
              <div>
                <div className="text-sm text-[#abc4ff80]">protocolFeeRate</div>
                <div className="text-[#abc4ff]">{toPercentString(config.protocolFeeRate, { fixed: 4 })}</div>
              </div>
              <div>
                <div className="text-sm text-[#abc4ff80]">tickSpacing</div>
                <div className="text-[#abc4ff]">{config.tickSpacing}</div>
              </div>
              <div>
                <div className="text-sm text-[#abc4ff80]">tradeFeeRate</div>
                <div className="text-[#abc4ff]">{toPercentString(config.tradeFeeRate, { fixed: 4 })}</div>
              </div>
            </Col>
          </div>
        )
      })}
    </Row>
  )
}

function ConcentratedFeeSwitcherFace({
  open,
  currentConfig
}: {
  open: boolean
  currentConfig?: HydratedAmmV3ConfigInfo
}) {
  return (
    <Row className={`p-5 mobile:py-4 mobile:px-5 gap-2 items-stretch justify-between`}>
      {currentConfig ? (
        <Row className="gap-4">
          <div>
            <div className="text-sm text-[#abc4ff80]">protocolFeeRate</div>
            <div className="text-[#abc4ff]">{toPercentString(currentConfig.protocolFeeRate, { fixed: 4 })}</div>
          </div>
          <div>
            <div className="text-sm text-[#abc4ff80]">tickSpacing</div>
            <div className="text-[#abc4ff]">{currentConfig.tickSpacing}</div>
          </div>
          <div>
            <div className="text-sm text-[#abc4ff80]">tradeFeeRate</div>
            <div className="text-[#abc4ff]">{toPercentString(currentConfig.tradeFeeRate, { fixed: 4 })}</div>
          </div>
        </Row>
      ) : (
        <div> -- </div>
      )}
      <Grid className="w-6 h-6 place-items-center self-center">
        <Icon size="sm" heroIconName={`${open ? 'chevron-up' : 'chevron-down'}`} />
      </Grid>
    </Row>
  )
}
