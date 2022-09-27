import { HydratedConcentratedInfo } from '@/application/concentrated/type'
import useConcentrated from '@/application/concentrated/useConcentrated'
import Row from '@/components/Row'
import Col from '@/components/Col'
import toPubString from '@/functions/format/toMintString'
import toPercentString from '@/functions/format/toPercentString'

export function ConcentratedFeeSwitcherContent({
  unselectedAmmPools
}: {
  unselectedAmmPools?: HydratedConcentratedInfo[]
}) {
  return (
    <Row className="p-4 gap-4">
      {unselectedAmmPools?.map((unselectedAmmPool) => (
        <div
          key={toPubString(unselectedAmmPool.state.id)}
          className="grow p-5 mobile:py-4 mobile:px-5 gap-2 items-stretch ring-inset ring-1.5 ring-[rgba(171,196,255,.5)] rounded-xl"
          onClick={() => {
            useConcentrated.setState({ currentAmmPool: unselectedAmmPool })
          }}
        >
          <Col className="gap-4">
            <div>
              <div className="text-sm text-[#abc4ff80]">protocolFeeRate</div>
              <div className="text-[#abc4ff]">{toPercentString(unselectedAmmPool.protocolFeeRate, { fixed: 4 })}</div>
            </div>
            <div>
              <div className="text-sm text-[#abc4ff80]">tickSpacing</div>
              <div className="text-[#abc4ff]">{unselectedAmmPool.state.tickSpacing}</div>
            </div>
            <div>
              <div className="text-sm text-[#abc4ff80]">tradeFeeRate</div>
              <div className="text-[#abc4ff]">{toPercentString(unselectedAmmPool.tradeFeeRate, { fixed: 4 })}</div>
            </div>
          </Col>
        </div>
      ))}
    </Row>
  )
}
