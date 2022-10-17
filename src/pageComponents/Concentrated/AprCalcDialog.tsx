import useConcentrated, { ConcentratedStore } from '@/application/concentrated/useConcentrated'
import Button from '@/components/Button'
import Card from '@/components/Card'
import Col from '@/components/Col'
import Grid from '@/components/Grid'
import Icon from '@/components/Icon'
import ResponsiveDialogDrawer from '@/components/ResponsiveDialogDrawer'
import Row from '@/components/Row'
import { useGlobInstanceDetector } from './useGlobInstanceDetector'

export default function AprCalcDialog() {
  const open = useConcentrated((s) => s.isAprCalcPanelShown)
  const aprCalcMode = useConcentrated((s) => s.aprCalcMode)
  const { isFirstDetectedComponentInThisPage } = useGlobInstanceDetector(AprCalcDialog.name)
  if (!isFirstDetectedComponentInThisPage) return null
  const choices: {
    aprCalcMethod: ConcentratedStore['aprCalcMode']
    title: string
    description: string
  }[] = [
    {
      aprCalcMethod: 'B',
      title: 'plan B',
      description: 'This is how Orca’s calculation method work. I don’t know how but we think it’s bullshit lol.'
    },
    {
      aprCalcMethod: 'C',
      title: 'plan C',
      description: 'This is how our calculation method work. I don’t know how but I believe it’s better.'
    }
  ]
  return (
    <ResponsiveDialogDrawer
      placement="from-bottom"
      open={open}
      onClose={() => {
        useConcentrated.setState({
          isAprCalcPanelShown: false
        })
      }}
    >
      {({ close: closeDialog }) => (
        <Card
          className="p-8 mobile:p-4 rounded-3xl mobile:rounded-lg w-[min(456px,90vw)] max-h-[80vh] overflow-auto mobile:w-full border-1.5 border-[rgba(171,196,255,0.2)] bg-cyberpunk-card-bg shadow-cyberpunk-card"
          size="lg"
        >
          <Row className="justify-between items-center mb-4 mobile:mb-2">
            <div className="mobile:text-base text-xl font-semibold text-white">APR Calculation Method</div>
            <Icon className="text-[#ABC4FF] cursor-pointer" heroIconName="x" onClick={closeDialog} />
          </Row>

          <div className="text-[#abc4ff]">
            We provide 2 different ways to calculate APR and you can choose the one you prefer to use. Please note that
            both of the 2 methods are just{' '}
            <span className="text-[#DA2EEF]">rough estimations and are only for your reference.</span>
          </div>

          <Col className="gap-2 my-4">
            {/* choice */}
            {choices.map((choice) => {
              const isCurrent = choice.aprCalcMethod === aprCalcMode
              return (
                <Grid
                  className={`grid-cols-2-auto gap-y-3 py-3 px-5 rounded-xl bg-[#141041] ${
                    isCurrent ? 'border-1.5 border-[#39d0d8]' : 'border-1.5 border-transparent'
                  } transition-colors`}
                  key={choice.title}
                  onClick={() => useConcentrated.setState({ aprCalcMode: choice.aprCalcMethod })}
                >
                  <div className="text-white font-medium">{choice.title}</div>
                  <Icon
                    heroIconName="check-circle"
                    size="smi"
                    className={`justify-self-end ${isCurrent ? '' : 'hidden'} text-[#39d0d8]`}
                  />
                  <div className="col-span-full text-sm text-[#abc4ff80]">{choice.description}</div>
                </Grid>
              )
            })}
          </Col>
          <Button className="w-full frosted-glass-teal" onClick={() => closeDialog()}>
            Confirm
          </Button>
        </Card>
      )}
    </ResponsiveDialogDrawer>
  )
}
