import { ReactNode } from 'react'

import { Fraction, PublicKeyish } from '@raydium-io/raydium-sdk'

import { twMerge } from 'tailwind-merge'

import useAppSettings from '@/application/common/useAppSettings'
import { txClaimAllCompensation } from '@/application/compensation/txClaimAllCompensation'
import { txClaimCompensation } from '@/application/compensation/txClaimCompensation'
import { HydratedCompensationInfoItem } from '@/application/compensation/type'
import { useCompensationMoney } from '@/application/compensation/useCompensation'
import useCompensationMoneyInfoLoader from '@/application/compensation/useCompensationInfoLoader'
import { TokenAmount } from '@/application/token/type'
import useToken from '@/application/token/useToken'
import useWallet from '@/application/wallet/useWallet'
import { AddressItem } from '@/components/AddressItem'
import AutoBox from '@/components/AutoBox'
import { Badge } from '@/components/Badge'
import Button from '@/components/Button'
import Card from '@/components/Card'
import CoinAvatar from '@/components/CoinAvatar'
import Col from '@/components/Col'
import Grid from '@/components/Grid'
import Icon from '@/components/Icon'
import Image from '@/components/Image'
import Link from '@/components/Link'
import LoadingCircle from '@/components/LoadingCircle'
import PageLayout from '@/components/PageLayout'
import RefreshCircle from '@/components/RefreshCircle'
import Row from '@/components/Row'
import Tooltip from '@/components/Tooltip'
import { toSentenceCase } from '@/functions/changeCase'
import { toUTC } from '@/functions/date/dateFormat'
import toPubString from '@/functions/format/toMintString'
import toPercentString from '@/functions/format/toPercentString'
import { toTokenAmount } from '@/functions/format/toTokenAmount'
import { add, div, getMax, minus, mul } from '@/functions/numberish/operations'
import { toString } from '@/functions/numberish/toString'

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
            <div>This portal is for claiming assets from pools affected by the December 16th exploit.</div>
            <div>
              If you had LP positions that were affected, details can be viewed below and assets claimed. For full info,{' '}
              <Link href="https://docs.raydium.io/raydium/updates/claim-portal">click here</Link>.
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
                  <InputCard key={toPubString(showInfo.ownerAccountId)} info={showInfo} />
                ))}
              </Grid>
            </div>
          ) : (
            <Grid className="justify-center mt-24">
              <Image className="mx-auto" src="https://img.raydium.io/ui/backgroundImages/not-found.svg" />
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
          <Image className="mx-auto" src="https://img.raydium.io/ui/backgroundImages/not-found.svg" />
          <div className="mt-10 mx-auto text-[#abc4ff] text-sm">Connect wallet to see LP position details</div>
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
              <Row className="gap-2">
                <div className="text-xl font-bold text-[#fff] ">{info.poolName}</div>
                {info.project && (
                  <Row className="items-center">
                    <div className="text-lg mobile:text-base font-semibold text-[#fff]">({info.project})</div>
                    <Tooltip panelClassName="bg-[#3b4146]" arrowClassName="bg-[#3b4146]">
                      <Icon
                        size="sm"
                        heroIconName="question-mark-circle"
                        className={twMerge('mx-1 cursor-help text-[#fff]')}
                      />
                      <Tooltip.Panel>
                        <p className="w-60">
                          This position was opened on the third-party protocol listed here, and not on Raydium directly.
                          Individual position data was provided by the protocol.
                        </p>
                      </Tooltip.Panel>
                    </Tooltip>
                  </Row>
                )}
              </Row>
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
        <Col className="ml-auto mobile:ml-0 items-end mobile:items-start">
          <Row className="items-center gap-1">
            <Tooltip panelClassName="bg-[#3b4146]" arrowClassName="bg-[#3b4146]">
              <Icon
                size="sm"
                heroIconName="question-mark-circle"
                className={twMerge('mx-1 cursor-help text-[#abc4ff80]')}
              />
              <Tooltip.Panel>
                <p className="w-60">Your LP token balance at the time of the snapshot</p>
              </Tooltip.Panel>
            </Tooltip>
            <div className="font-medium mobile:-order-1 text-base mobile:text-sm text-[#abc4ff80]">
              Snapshot LP token balance
            </div>
          </Row>
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
              tooltip1?: string
              label2: string
              amount2: TokenAmount | undefined
              symbol2?: string
              tooltip2?: string
              label3: string
              amount3: TokenAmount | undefined
              symbol3?: string
              tooltip3?: string
              label4: string
              amount4: TokenAmount | undefined
              symbol4?: string
              tooltip4?: string
            }) => (
              <Col>
                <Fieldset
                  className="pb-2"
                  name={info.label1}
                  tooltip={info.tooltip1}
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
                  tooltip={info.tooltip2}
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
                  tooltip={info.tooltip3}
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
                  tooltip={info.tooltip4}
                  labelClassName="text-[#fff] font-medium"
                  tooltipClassName="text-[#fff] font-medium"
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
                        tooltip1: 'The amount of base tokens lost per LP token',
                        label2: 'Snapshot LP',
                        amount2: info.snapshotLpAmount,
                        tooltip2: 'Your LP token balance at the time of the snapshot',
                        symbol2: 'LP',
                        label3: 'Total base',
                        tooltip3: 'The total base token amount lost. Total = (Per LP loss) * (Snapshot LP)',
                        amount3: tokenInfo.ownerAllLossAmount,
                        label4: `Claimable (${toPercentString(div(tokenInfo.debtAmount, tokenInfo.ownerAllLossAmount), {
                          fixed: 0
                        })})`,
                        amount4: tokenInfo.debtAmount
                      }
                    : idx === 1
                    ? {
                        label1: 'Per LP loss',
                        amount1: tokenInfo.perLpLoss,
                        tooltip1: 'The amount of quote tokens lost per LP token',
                        label2: 'Snapshot LP',
                        amount2: info.snapshotLpAmount,
                        symbol2: 'LP',
                        tooltip2: 'Your LP token balance at the time of the snapshot',
                        label3: 'Total quote',
                        tooltip3: 'The total quote token amount lost. Total = (Per LP loss) * (Snapshot LP)',
                        amount3: tokenInfo.ownerAllLossAmount,
                        label4: `Claimable (${toPercentString(div(tokenInfo.debtAmount, tokenInfo.ownerAllLossAmount), {
                          fixed: 0
                        })})`,
                        amount4: tokenInfo.debtAmount
                      }
                    : {
                        label1: 'Remaining base',
                        amount1: tokenInfos[0]
                          ? toTokenAmount(
                              tokenInfos[0].token,
                              getMax(minus(tokenInfos[0].ownerAllLossAmount, tokenInfos[0].debtAmount), 0),
                              { alreadyDecimaled: true }
                            )
                          : undefined,
                        tooltip1:
                          'This represents the remaining loss not claimable in original pool assets. Remaining = Total - Claimable',
                        label2: 'Remaining quote',
                        amount2: tokenInfos[1]
                          ? toTokenAmount(
                              tokenInfos[1].token,
                              getMax(minus(tokenInfos[1].ownerAllLossAmount, tokenInfos[1].debtAmount), 0),
                              { alreadyDecimaled: true }
                            )
                          : undefined,
                        tooltip2:
                          'This represents the remaining loss not claimable in original pool assets. Remaining = Total - Claimable',
                        label3: `Total value in ${tokenInfo.ownerAllLossAmount.token.symbol ?? '--'}`,
                        amount3: tokenInfo.ownerAllLossAmount,
                        tooltip3: `This is the value (at the time of the exploit) of the remaining 10% of lost assets denominated in ${tokenInfo.debtAmount.token.symbol} (at a 30-day TWAP price).`,
                        label4: `Compensation`,
                        amount4: tokenInfo.debtAmount,
                        tooltip4:
                          'This is the claimable amount of RAY as compensation and is equal to (Total value in RAY)*(1.2). This equates to 20% additional RAY as compensation.'
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
                      : info.canClaimErrorType === 'outOfOperationalTime'
                      ? 'Claims currently closed'
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
  labelClassName,
  tooltipClassName
}: {
  name: string
  className?: string
  tooltip?: string
  renderFormItem: ReactNode
  labelClassName?: string
  tooltipClassName?: string
}) {
  return (
    <Grid className={twMerge('grid-cols-[1fr,1fr] gap-8', className)}>
      <Row className="items-center">
        <div className={twMerge('text-base mobile:text-sm text-[#abc4ff]', labelClassName)}>{name}</div>
        {tooltip && (
          <Tooltip panelClassName="bg-[#3b4146]" arrowClassName="bg-[#3b4146]">
            <Icon
              size="sm"
              heroIconName="question-mark-circle"
              className={twMerge('mx-1 cursor-help text-[#abc4ff]', tooltipClassName)}
            />
            <Tooltip.Panel>
              <p className="w-60">{tooltip}</p>
            </Tooltip.Panel>
          </Tooltip>
        )}
      </Row>
      <div className="justify-self-end mobile:text-sm">{renderFormItem}</div>
    </Grid>
  )
}
