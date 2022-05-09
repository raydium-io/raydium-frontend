import useCreateFarms from '@/application/createFarm/useCreateFarm'
import Button from '@/components/Button'
import Card from '@/components/Card'
import CoinInputBox from '@/components/CoinInputBox'
import Col from '@/components/Col'
import CyberpunkStyleCard from '@/components/CyberpunkStyleCard'
import TokenSelectorDialog from '@/components/dialogs/TokenSelectorDialog'
import Grid from '@/components/Grid'
import Icon from '@/components/Icon'
import Input from '@/components/Input'
import Link from '@/components/Link'
import PageLayout from '@/components/PageLayout'
import Row from '@/components/Row'
import useToggle from '@/hooks/useToggle'
import { type } from 'os'
import { title } from 'process'
import { ReactNode } from 'react'

// unless ido have move this component, it can't be renamed or move to /components
function StepBadge(props: { n: number }) {
  return (
    <CyberpunkStyleCard wrapperClassName="w-8 h-8" className="grid place-content-center bg-[#2f2c78]">
      <div className="font-semibold text-white">{props.n}</div>
    </CyberpunkStyleCard>
  )
}

function WarningBoard({ className }: { className: string }) {
  return (
    <Row className={className}>
      <Icon iconSrc="/icons/create-farm-exclamation-circle.svg" className="my-4" iconClassName="w-12 h-12" />
      <Card
        className={`min-w-[260px] relative rounded-xl ring-1.5 ring-inset ring-[#DA2EEF] bg-[#1B1659] p-6 mx-4 my-2 overflow-hidden pointer-events-auto`}
      >
        <div className="font-medium text-base text-white mb-3">This tool is for advanced users!</div>

        <div className="font-medium text-sm text-[#ABC4FF80] mb-4">
          Before attempting to create a new farm, we suggest going through the detailed guide.
        </div>

        <Row className="gap-4">
          <Link href="https://raydium.gitbook.io/raydium/exchange-trade-and-swap/raydium-farms">
            <Button className="frosted-glass-teal px-8">Detail Guide</Button>
          </Link>

          <Button className="text-[#ABC4FF80]" type="outline">
            Dismiss
          </Button>
        </Row>
      </Card>
    </Row>
  )
}
function SearchBlock() {
  const searchPoolId = useCreateFarms((s) => s.searchPoolId)
  return (
    <Input
      value={searchPoolId}
      className="px-2 py-2 mobile:py-1 gap-2 border-1.5 border-[rgba(196,214,255,0.5)] rounded-xl min-w-[7em]"
      inputClassName="font-medium mobile:text-xs text-[rgba(196,214,255,0.5)] placeholder-[rgba(196,214,255,0.5)]"
      suffix={<Icon heroIconName="search" className="text-[rgba(196,214,255,0.5)]" />}
      placeholder="Search by token"
      onUserInput={(searchText) => {
        // useFarms.setState({ searchText })
      }}
    />
  )
}

function FormStep({
  stepNumber,
  title,
  haveNavline,
  children
}: {
  stepNumber: number
  title: ReactNode
  haveNavline?: boolean
  children: ReactNode
}) {
  return (
    <Row className="gap-4">
      <Col className="items-center">
        <StepBadge n={stepNumber} />
        <div className={`grow my-4 border-r-1.5 ${haveNavline ? 'border-[#abc4ff1a]' : 'border-transparent'} `} />
      </Col>
      <Col>
        <div className="font-medium text-base text-white mb-3">{title}</div>
        <div className="mb-16">{children}</div>
      </Col>
    </Row>
  )
}

export default function CreateFarmPage() {
  const [isCoinSelectorOn, { on: turnOnCoinSelector, off: turnOffCoinSelector }] = useToggle()
  return (
    <PageLayout metaTitle="Farms - Raydium">
      <div className="self-center w-[min(560px,90vw)]">
        <div className="pb-8 text-2xl mobile:text-lg font-semibold justify-self-start text-white">Create Farm</div>

        <WarningBoard className="mb-16" />

        <div className="space-y-4">
          <FormStep stepNumber={1} title="Select Pool" haveNavline>
            <CoinInputBox />
          </FormStep>

          <FormStep
            stepNumber={2}
            title={
              <>
                Farming Reward
                <div>
                  Please note: All rewards provided are final and unused rewards cannot be recovered. You will be able
                  to add more rewards to the farm.
                </div>
              </>
            }
            haveNavline
          >
            <Card className="p-4 mobile:px-2 bg-cyberpunk-card-bg border-1.5 border-[rgba(171,196,255,0.2)]" size="lg">
              <CoinInputBox
                haveHalfButton
                haveCoinIcon
                showTokenSelectIcon
                topLeftLabel="Assert"
                onTryToTokenSelect={() => {
                  turnOnCoinSelector()
                }}
                // onEnter={(input) => {
                //   if (!input) return
                //   if (!coin2) coinInputBox2ComponentRef.current?.selectToken?.()
                //   if (coin2 && coin2Amount) swapButtonComponentRef.current?.click?.()
                // }}
                // token={coin1}
                // value={coin1Amount ? (eq(coin1Amount, 0) ? '' : toString(coin1Amount)) : undefined}
                // onUserInput={(value) => {
                //   useSwap.setState({ focusSide: 'coin1', coin1Amount: value })
                // }}
              />
              <TokenSelectorDialog
                open={isCoinSelectorOn}
                onSelectCoin={(token) => {
                  // if (targetCoinNo === '1') {
                  //   useSwap.setState({ coin1: token })
                  //   if (!areTokenPairSwapable(token, coin2)) {
                  //     useSwap.setState({ coin2: undefined })
                  //   }
                  // } else {
                  //   useSwap.setState({ coin2: token })
                  //   if (!areTokenPairSwapable(token, coin1)) {
                  //     useSwap.setState({ coin1: undefined })
                  //   }
                  // }
                  turnOffCoinSelector()
                }}
                close={turnOffCoinSelector}
              />
            </Card>
          </FormStep>

          <FormStep stepNumber={3} title="Farm Period">
            <CoinInputBox />
          </FormStep>
        </div>

        <Button className="frosted-glass-teal ml-12" size="lg">
          Review Farm
        </Button>
      </div>
    </PageLayout>
  )
}
