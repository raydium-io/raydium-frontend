import { HydratedConcentratedInfo } from '@/application/concentrated/type'
import toPercentString from '@/functions/format/toPercentString'
import Row from '@/components/Row'
import Grid from '@/components/Grid'
import Icon from '@/components/Icon'

export default function ConcentratedFeeSwitcherFace({
  open,
  currentPool,
  haveArrow
}: {
  haveArrow?: boolean
  open: boolean
  currentPool?: HydratedConcentratedInfo
}) {
  return (
    <Row className={`p-5 mobile:py-4 mobile:px-5 gap-2 items-stretch justify-between`}>
      {currentPool ? (
        <Row className={`${haveArrow ? 'gap-4' : 'justify-between w-full'}`}>
          <div>
            <div className="text-sm text-[#abc4ff80]">protocolFeeRate</div>
            <div className="text-[#abc4ff]">{toPercentString(currentPool.protocolFeeRate, { fixed: 4 })}</div>
          </div>
          <div>
            <div className="text-sm text-[#abc4ff80]">tickSpacing</div>
            <div className="text-[#abc4ff]">{currentPool.state.tickSpacing}</div>
          </div>
          <div>
            <div className="text-sm text-[#abc4ff80]">tradeFeeRate</div>
            <div className="text-[#abc4ff]">{toPercentString(currentPool.tradeFeeRate, { fixed: 4 })}</div>
          </div>
        </Row>
      ) : (
        <div> -- </div>
      )}
      <Grid className={`w-6 h-6 place-items-center self-center ${haveArrow ? '' : 'hidden'}`}>
        <Icon size="sm" heroIconName={`${open ? 'chevron-up' : 'chevron-down'}`} />
      </Grid>
    </Row>
  )
}
