import Row from '@/components/Row'
import { HydratedConcentratedInfo } from '@/application/concentrated/type'
import Icon from '@/components/Icon'

interface Props {
  pool: HydratedConcentratedInfo
}

export default function AddNewReward(props: Props) {
  return (
    <>
      <Row className="items-center">
        <Icon className="text-[#abc4ff]" heroIconName="plus-circle" size="sm" />
        <div className="ml-1.5 text-[#abc4ff] font-base mobile:text-sm">Add another reward token</div>
        <div className="ml-1.5 text-[#abc4ff80] font-base mobile:text-sm">(1 more)</div>
      </Row>
    </>
  )
}
