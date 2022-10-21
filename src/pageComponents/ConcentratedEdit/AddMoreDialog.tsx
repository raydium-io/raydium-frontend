import Row from '@/components/Row'
import Col from '@/components/Col'
import { HydratedConcentratedInfo } from '@/application/concentrated/type'
import Button from '@/components/Button'
import CoinInputBox from '@/components/CoinInputBox'
import ResponsiveDialogDrawer from '@/components/ResponsiveDialogDrawer'
import Card from '@/components/Card'
import { Unpacked } from '@/types/generics'

interface Props {
  open: boolean
  onClose: () => void
  reward?: Unpacked<HydratedConcentratedInfo['rewardInfos']>
}

export default function AddMoreDialog({ open, reward, onClose }: Props) {
  return (
    <>
      <ResponsiveDialogDrawer placement="from-bottom" open={open} onClose={onClose}>
        {({ close: closeDialog }) => (
          <Card
            className="p-8 mobile:p-4 rounded-3xl mobile:rounded-lg w-[min(480px,90vw)] max-h-[80vh] overflow-auto mobile:w-full border-1.5 border-[rgba(171,196,255,0.2)] bg-cyberpunk-card-bg shadow-cyberpunk-card"
            size="lg"
          >
            <Row className="justify-between items-center mb-6 mobile:mb-2">
              <div className="mobile:text-base text-xl font-semibold text-white">Add more rewards</div>
            </Row>

            <Col>
              <CoinInputBox
                className="mb-4 py-2 border-none mobile:py-1 px-3 mobile:px-2 border-1.5 border-[#abc4ff40]"
                // disabledInput={!currentAmmPool || coin1InputDisabled}
                noDisableStyle
                // value={undefined}
                haveHalfButton
                haveCoinIcon
                topLeftLabel="Asset"
                onUserInput={(amount) => {
                  // useConcentrated.setState({ coin1Amount: amount, userCursorSide: 'coin1' })
                }}
                token={reward?.rewardToken}
              />
            </Col>

            <Row className="justify-between items-center mb-6 mobile:mb-2">
              <Button className="frosted-glass-teal" onClick={() => closeDialog()}>
                Save
              </Button>
              <Button type="text" className="text-sm text-[#ABC4FF] bg-cancel-bg" onClick={closeDialog}>
                Cancel
              </Button>
            </Row>
          </Card>
        )}
      </ResponsiveDialogDrawer>
    </>
  )
}
