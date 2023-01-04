import useAppSettings from '@/application/common/useAppSettings'
import { txClaimAllCompensation } from '@/application/compensation/txClaimAllCompensation'
import { txClaimCompensation } from '@/application/compensation/txClaimCompensation'
import { HydratedCompensationInfoItem } from '@/application/compensation/type'
import { useCompensationMoney } from '@/application/compensation/useCompensation'
import useCompensationMoneyInfoLoader from '@/application/compensation/useCompensationInfoLoader'
import { TokenAmount } from '@/application/token/type'
import useWallet from '@/application/wallet/useWallet'
import { AddressItem } from '@/components/AddressItem'
import AutoBox from '@/components/AutoBox'
import Button from '@/components/Button'
import Card from '@/components/Card'
import CoinAvatar from '@/components/CoinAvatar'
import Col from '@/components/Col'
import Grid from '@/components/Grid'
import Icon from '@/components/Icon'
import Link from '@/components/Link'
import Image from '@/components/Image'
import LoadingCircle from '@/components/LoadingCircle'
import PageLayout from '@/components/PageLayout'
import Row from '@/components/Row'
import Tooltip from '@/components/Tooltip'
import { toSentenceCase } from '@/functions/changeCase'
import { toUTC } from '@/functions/date/dateFormat'
import toPubString from '@/functions/format/toMintString'
import toPercentString from '@/functions/format/toPercentString'
import { add, div, mul } from '@/functions/numberish/operations'
import { toString } from '@/functions/numberish/toString'
import { ReactNode } from 'react'
import { twMerge } from 'tailwind-merge'
import RefreshCircle from '@/components/RefreshCircle'
import useToken from '@/application/token/useToken'
import { PublicKeyish } from '@raydium-io/raydium-sdk'
import { Badge } from '@/components/Badge'

/**
 * temporary pay money to user for be hacked by hacker page
 */

export default function CompensationPage() {
  useCompensationMoneyInfoLoader()
  const { dataLoaded, hydratedCompensationInfoItems } = useCompensationMoney()
  const dataListIsFilled = Boolean(hydratedCompensationInfoItems?.length)
  const isApprovePanelShown = useAppSettings((s) => s.isApprovePanelShown)
  const isMobile = useAppSettings((s) => s.isMobile)
  const connected = useWallet((s) => s.connected)

  return (
    <PageLayout mobileBarTitle="Claim portal" metaTitle="Claim portal - Raydium" contentButtonPaddingShorter>
      <AutoBox is={isMobile ? 'Col' : 'Row'} className="items-center justify-between gap-4">
        <div>
          <div className="title text-2xl mobile:text-lg font-bold justify-self-start text-white mb-4">Claim Portal</div>
          <div className="text-[#abc4ff] mobile:text-xs mb-4 space-y-4">
            <div>This portal is for claiming assets from pools affected by the December 15th exploit.</div>
            <div>
              If you had LP positions that were affected, details can be viewed below and assets claimed. For full info,{' '}
              <Link href="https://v1.raydium.io/migrate/">click here</Link>.
            </div>
          </div>
        </div>

        {connected && dataListIsFilled && (
          <Col className="items-end mobile:items-center gap-4">
            <RefreshCircle
              refreshKey="compensation"
              freshFunction={() => {
                useCompensationMoney.getState().refresh()
              }}
            />
            <Button
              className="w-[12em] frosted-glass-teal mb-8"
              size={isMobile ? 'sm' : 'md'}
              isLoading={isApprovePanelShown}
              validators={[
                {
                  should: connected,
                  forceActive: true,
                  fallbackProps: {
                    onClick: () => useAppSettings.setState({ isWalletSelectorShown: true }),
                    children: 'Connect Wallet'
                  }
                },
                {
                  should: hydratedCompensationInfoItems?.some((i) => i.canClaim),
                  fallbackProps: { children: 'Claimed' }
                }
              ]}
              onClick={() =>
                hydratedCompensationInfoItems &&
                txClaimAllCompensation({ poolInfos: hydratedCompensationInfoItems.filter((i) => i.canClaim) })
              }
            >
              Claim all
            </Button>
          </Col>
        )}
      </AutoBox>

      {connected ? (
        dataLoaded || hydratedCompensationInfoItems ? (
          dataListIsFilled ? (
            <div className="py-12">
              <Grid className="gap-32 ">
                {hydratedCompensationInfoItems?.map((showInfo) => (
                  <InputCard key={toPubString(showInfo.ammId)} info={showInfo} />
                ))}
              </Grid>
            </div>
          ) : (
            <Grid className="justify-center mt-24">
              <Image className="mx-auto" src="/backgroundImages/not-found.svg" />
              <div className="mt-10 mx-auto text-[#abc4ff] text-sm">You have no affected positions to claim</div>
              <div className="mt-3 mx-auto mobile:w-full">
                <Link href="/pools">Go to Pools</Link>
              </div>
            </Grid>
          )
        ) : (
          <Grid className="justify-center">
            <LoadingCircle />
          </Grid>
        )
      ) : (
        <Grid className="justify-center mt-24">
          <Image className="mx-auto" src="/backgroundImages/not-found.svg" />
          <div className="mt-10 mx-auto text-[#abc4ff] text-sm">Please connect the wallet to view detail</div>
          <div className="mt-14 mx-auto w-[400px] mobile:w-full">
            <Button
              className="w-full frosted-glass-teal mb-8"
              size={isMobile ? 'sm' : 'md'}
              onClick={() => useAppSettings.setState({ isWalletSelectorShown: true })}
            >
              Connect Wallet
            </Button>
          </div>
        </Grid>
      )}
    </PageLayout>
  )
}

function InputCard({ info }: { info: HydratedCompensationInfoItem }) {
  const isApprovePanelShown = useAppSettings((s) => s.isApprovePanelShown)
  const isMobile = useAppSettings((s) => s.isMobile)
  const tokenPrices = useToken((s) => s.tokenPrices)
  const getTokenPrice = (mint: PublicKeyish | undefined) => (mint ? tokenPrices[toPubString(mint)] : undefined)
  return (
    <Col className="gap-6 mobile:gap-4 mx-auto w-full">
      <AutoBox is={isMobile ? 'Col' : 'Row'} className="gap-4 mobile:gap-2 items-end mobile:items-start">
        <Col className="gap-1.5">
          <Col className="gap-1">
            <Row className="gap-4">
              <div className="text-xl font-bold text-[#fff] ">{info.poolName}</div>
              {!info.canClaim && info.canClaimErrorType === 'alreadyClaimIt' && (
                <Badge className="w-fit text-sm" cssColor="#39d0d8">
                  Claimed
                </Badge>
              )}
            </Row>
            <div className="w-fit">
              <AddressItem showDigitCount={isMobile ? 8 : 12} className="text-[#abc4ff80] text-sm">
                {info.ammId}
              </AddressItem>
            </div>
          </Col>
          <div className="text-[#abc4ff80] text-sm">
            {toUTC(info.openTime)} - {toUTC(info.endTime)}
          </div>
        </Col>
        <Col className="ml-auto mobile:ml-0 items-end">
          <div className="font-medium text-base mobile:text-sm text-[#abc4ff80]">Snapshot LP token balance</div>
          <div className="font-medium mobile:text-sm text-[#abc4ff]">{toString(info.snapshotLpAmount)} LP</div>
        </Col>
      </AutoBox>
      <div className="w-full mx-auto">
        <Grid
          className={`grid-cols-[repeat(auto-fit,minmax(min(400px,100%),1fr))] gap-10 ${
            !info.canClaim && info.canClaimErrorType === 'alreadyClaimIt' ? 'opacity-50' : ''
          }`}
        >
          {info.tokenInfo.map((tokenInfo, idx, tokenInfos) => {
            const label = idx === 0 ? 'BASE' : idx === 1 ? 'QUOTE' : 'COMPENSATION'
            if (!tokenInfo) return null

            const listContent = (info: {
              label1: string
              amount1: TokenAmount | undefined
              symbol1?: string
              label2: string
              amount2: TokenAmount | undefined
              symbol2?: string
              label3: string
              amount3: TokenAmount | undefined
              symbol3?: string
              label4: string
              amount4: TokenAmount | undefined
              symbol4?: string
            }) => (
              <Col>
                <Fieldset
                  className="pb-2"
                  name={info.label1}
                  renderFormItem={
                    <Row>
                      <div className="text-[#abc4ff80] min-w-[2em] mr-2">{toString(info.amount1)}</div>
                      <div className="text-[#abc4ff] min-w-[3em]">{info.symbol1 ?? info.amount1?.token.symbol}</div>
                    </Row>
                  }
                />
                <Fieldset
                  className="py-2 border-b border-[#abc4ff80]"
                  name={info.label2}
                  renderFormItem={
                    <Row>
                      <div className="text-[#abc4ff80] min-w-[2em] mr-2">{toString(info.amount2)}</div>
                      <div className="text-[#abc4ff] min-w-[3em]">{info.symbol2 ?? info.amount2?.token.symbol}</div>
                    </Row>
                  }
                />
                <Fieldset
                  className="py-2 border-b border-[#abc4ff80] mb-1"
                  name={info.label3}
                  renderFormItem={
                    <Row>
                      <div className="text-[#abc4ff80] min-w-[2em] mr-2">{toString(info.amount3)}</div>
                      <div className="text-[#abc4ff] min-w-[3em]">{info.symbol3 ?? info.amount3?.token.symbol}</div>
                    </Row>
                  }
                />
                <Fieldset
                  className="pt-2 border-t border-[#abc4ff80]"
                  name={info.label4}
                  labelClassName="text-[#fff] font-medium"
                  renderFormItem={
                    <Row>
                      <div className="text-[#fff] font-medium min-w-[2em] mr-2">{toString(info.amount4)}</div>
                      <div className="text-white font-medium min-w-[3em]">
                        {info.symbol4 ?? info.amount4?.token.symbol}
                      </div>
                    </Row>
                  }
                />
              </Col>
            )

            return (
              <Card
                className="p-6 mobile:py-4 mobile:px-2 rounded-2xl bg-cyberpunk-card-bg shadow-cyberpunk-card"
                size="lg"
                key={idx}
              >
                <Row className="gap-6  mb-8">
                  <div className="text-lg mobile:text-sm text-[#fff] font-medium">{label}</div>
                  <Row className="items-center gap-2">
                    <CoinAvatar token={tokenInfo.token} size="md" />
                    <div className="text-[#abc4ff] font-medium min-w-[2em]">{tokenInfo.token.symbol ?? '--'}</div>
                  </Row>
                </Row>

                {listContent(
                  idx === 0
                    ? {
                        label1: 'Per LP loss',
                        amount1: tokenInfo.perLpLoss,
                        label2: 'Snapshot LP',
                        amount2: info.snapshotLpAmount,
                        symbol2: 'LP',
                        label3: 'Total loss',
                        amount3: tokenInfo.ownerAllLossAmount,
                        label4: `Claimable (${toPercentString(
                          div(tokenInfo.debtAmount, tokenInfo.ownerAllLossAmount)
                        )})`,
                        amount4: tokenInfo.debtAmount
                      }
                    : idx === 1
                    ? {
                        label1: 'Per LP loss',
                        amount1: tokenInfo.perLpLoss,
                        label2: 'Snapshot LP',
                        amount2: info.snapshotLpAmount,
                        symbol2: 'LP',
                        label3: 'Total loss',
                        amount3: tokenInfo.ownerAllLossAmount,
                        label4: `Claimable (${toPercentString(
                          div(tokenInfo.debtAmount, tokenInfo.ownerAllLossAmount)
                        )})`,
                        amount4: tokenInfo.debtAmount
                      }
                    : {
                        label1: 'Loss - base token',
                        amount1: tokenInfos[0]?.perLpLoss,
                        label2: 'Loss - quote token',
                        amount2: tokenInfos[1]?.perLpLoss,
                        label3: `Total loss in ${tokenInfo.ownerAllLossAmount.token.symbol ?? '--'}`,
                        amount3: tokenInfo.ownerAllLossAmount,
                        label4: `Compensation (${toPercentString(
                          div(
                            mul(tokenInfo.debtAmount, getTokenPrice(tokenInfo.debtAmount.token.mint)),
                            add(
                              mul(tokenInfos[0]?.perLpLoss, getTokenPrice(tokenInfos[0]?.perLpLoss.token.mint)),
                              mul(tokenInfos[1]?.perLpLoss, getTokenPrice(tokenInfos[1]?.perLpLoss.token.mint))
                            )
                          )
                        )})`,
                        amount4: tokenInfo.debtAmount
                      }
                )}
              </Card>
            )
          })}
        </Grid>

        <div className="mx-auto mt-10 w-[calc((100%-2*40px)/3)] mobile:w-full">
          <Button
            size="lg"
            className="w-full frosted-glass-teal"
            isLoading={info.canClaim && isApprovePanelShown}
            validators={[
              {
                should: info.canClaim,
                fallbackProps: {
                  children:
                    info.canClaimErrorType === 'alreadyClaimIt'
                      ? 'Claimed'
                      : info.canClaimErrorType
                      ? toSentenceCase(info.canClaimErrorType)
                      : 'Unknown Error'
                }
              }
            ]}
            onClick={() => txClaimCompensation({ poolInfo: info })}
          >
            Claim
          </Button>
        </div>
      </div>
    </Col>
  )
}

function Fieldset({
  name,
  className,
  tooltip,
  renderFormItem,
  labelClassName
}: {
  name: string
  className?: string
  tooltip?: string
  renderFormItem: ReactNode
  labelClassName?: string
}) {
  return (
    <Grid className={twMerge('grid-cols-[1fr,1fr] gap-8', className)}>
      <Row className="items-center">
        <div className={twMerge('text-base mobile:text-sm text-[#abc4ff]', labelClassName)}>{name}</div>
        {tooltip && (
          <Tooltip panelClassName="bg-[#3b4146]" arrowClassName="bg-[#3b4146]">
            <Icon size="sm" heroIconName="question-mark-circle" className="mx-1 cursor-help text-[#abc4ff]" />
            <Tooltip.Panel>
              <p className="w-80">{tooltip}</p>
            </Tooltip.Panel>
          </Tooltip>
        )}
      </Row>
      <div className="justify-self-end mobile:text-sm">{renderFormItem}</div>
    </Grid>
  )
}
