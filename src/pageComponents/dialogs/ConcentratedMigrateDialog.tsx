import { HydratedFarmInfo } from '@/application/farms/type'
import { HydratedLiquidityInfo } from '@/application/liquidity/type'
import useToken from '@/application/token/useToken'
import { RAYMint } from '@/application/token/wellknownToken.config'
import Button from '@/components/Button'
import Card from '@/components/Card'
import CoinAvatar from '@/components/CoinAvatar'
import Col from '@/components/Col'
import Grid from '@/components/Grid'
import Icon from '@/components/Icon'
import Link from '@/components/Link'
import ResponsiveDialogDrawer from '@/components/ResponsiveDialogDrawer'
import Row from '@/components/Row'
import useToggle from '@/hooks/useToggle'
import { useMemo } from 'react'

export default function ConcentratedMigrateDialog({
  info,
  open,
  onClose
}: {
  info: HydratedLiquidityInfo | HydratedFarmInfo
  open: boolean
  onClose: () => void
}) {
  const [canShowMigrateDetail, { on, off, delayOff }] = useToggle()

  const alertTitle = 'Migrate Position'
  const alertDescription =
    'We are no longer providing rewards to this pair any more. Would you like to migrate your position to CLMM pool?'
  const alertLinkText = 'What is CLMM pool?'

  const step1 = (closeDialog: () => void) => (
    <Col className="items-center">
      <Icon size="lg" heroIconName="information-circle" className={`text-[#abc4ff] mb-3`} />

      <div className="mb-6 text-center">
        <div className="font-semibold text-xl text-white mb-3">{alertTitle}</div>
        <div className="font-normal text-base text-[#ABC4FF]">{alertDescription}</div>
        <Link href="https://docs.raydium.io/raydium/concentrated-liquidity/what-is-concentrated-liquidity">
          {alertLinkText}
        </Link>
      </div>

      <div className="self-stretch">
        <Col>
          <Button className="text-[#ABC4FF] frosted-glass-teal" onClick={on}>
            Migrate
          </Button>
          <Button className="text-[#ABC4FF] text-sm -mb-4" type="text" onClick={closeDialog}>
            Not now
          </Button>
        </Col>
      </div>
    </Col>
  )

  const step2 = (closeDialog: () => void) => <DetailPanel info={info} />

  return (
    <ResponsiveDialogDrawer
      placement="from-bottom"
      open={open}
      onClose={() => {
        delayOff()
        onClose()
      }}
    >
      {({ close: closeDialog }) => (
        <Card
          className={`p-8 mobile:p-4 rounded-3xl mobile:rounded-lg ${
            canShowMigrateDetail ? 'w-[min(950px,90vw)]' : 'w-[min(450px,90vw)]'
          } mobile:w-full max-h-[80vh] overflow-auto border-1.5 border-[rgba(171,196,255,0.2)] bg-cyberpunk-card-bg shadow-cyberpunk-card transition`}
          size="lg"
        >
          {canShowMigrateDetail ? step2(closeDialog) : step1(closeDialog)}
        </Card>
      )}
    </ResponsiveDialogDrawer>
  )
}

function DetailPanel({ info }: { info: HydratedLiquidityInfo | HydratedFarmInfo }) {
  // NOTE: how to simplify this tedious issue in solidjs? 🤔
  const tokens = useToken((s) => s.tokens)
  const getToken = useToken((s) => s.getToken)

  const { quote, base } = useMemo(() => {
    const quote = getToken(RAYMint)
    const base = getToken(RAYMint)
    return { quote, base }
  }, [tokens])

  return (
    <Grid>
      <div>
        <div className="text-[#abc4ff] font-medium">My Position</div>
        <div className="border-1.5 border-[#abc4ff40] rounded-xl p-3">
          <Row className="justify-between">
            <Row>
              <CoinAvatar token={quote} size="md" />
              <div className="text-[#abc4ff] font-medium">{quote?.symbol ?? '--'}</div>
            </Row>
            <Row>
              <div className="text-[#fff] font-medium">23.33</div>
              <div className="text-[#fff] font-medium">{quote?.symbol ?? '--'}</div>
            </Row>
          </Row>
          <Row className="justify-between">
            <Row>
              <CoinAvatar token={base} size="md" />
              <div className="text-[#abc4ff] font-medium">{base?.symbol ?? '--'}</div>
            </Row>
            <Row>
              <div className="text-[#fff] font-medium">23.33</div>
              <div className="text-[#fff] font-medium">{base?.symbol ?? '--'}</div>
            </Row>
          </Row>
        </div>
      </div>
    </Grid>
  )
}
