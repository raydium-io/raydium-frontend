import useAppSettings from '@/application/common/useAppSettings'
import { txClaimAllCompensation } from '@/application/compensation/txClaimAllCompensation'
import { txClaimCompensation } from '@/application/compensation/txClaimCompensation'
import { HydratedCompensationInfoItem } from '@/application/compensation/type'
import { useCompensationMoney } from '@/application/compensation/useCompensation'
import useCompensationMoneyInfoLoader from '@/application/compensation/useCompensationInfoLoader'
import { AddressItem } from '@/components/AddressItem'
import AutoBox from '@/components/AutoBox'
import Button from '@/components/Button'
import CoinAvatar from '@/components/CoinAvatar'
import Col from '@/components/Col'
import Grid from '@/components/Grid'
import Icon from '@/components/Icon'
import LoadingCircle from '@/components/LoadingCircle'
import LoadingCircleSmall from '@/components/LoadingCircleSmall'
import PageLayout from '@/components/PageLayout'
import Row from '@/components/Row'
import Tooltip from '@/components/Tooltip'
import changeCase, { toSentenceCase } from '@/functions/changeCase'
import { toUTC } from '@/functions/date/dateFormat'
import toPubString from '@/functions/format/toMintString'
import { isMeaningfulNumber } from '@/functions/numberish/compare'
import { toString } from '@/functions/numberish/toString'
import { ReactNode } from 'react'

/**
 * temporary pay money to user for be hacked by hacker page
 */

export default function CompensationPage() {
  useCompensationMoneyInfoLoader()
  const { dataLoaded, hydratedCompensationInfoItems } = useCompensationMoney()
  const isApprovePanelShown = useAppSettings((s) => s.isApprovePanelShown)
  const isMobile = useAppSettings((s) => s.isMobile)
  return (
    <PageLayout mobileBarTitle="compensation" metaTitle="compensation - Raydium" contentButtonPaddingShorter>
      <div className="title text-2xl mobile:text-lg font-semibold justify-self-start text-white mb-4">Compensation</div>
      <div className="font-semibold justify-self-start text-[#abc4ff] mb-4">
        OK, here is the money. Please send a tx to get the money.
      </div>
      {dataLoaded || hydratedCompensationInfoItems ? (
        hydratedCompensationInfoItems?.length ? (
          <div className="py-12">
            <Button
              className="w-[12em] frosted-glass-teal mb-8"
              size={isMobile ? 'sm' : 'lg'}
              isLoading={isApprovePanelShown}
              validators={[
                {
                  should: hydratedCompensationInfoItems.some((i) => i.canClaim),
                  fallbackProps: { children: 'Claimed' }
                }
              ]}
              onClick={() =>
                txClaimAllCompensation({ poolInfos: hydratedCompensationInfoItems.filter((i) => i.canClaim) })
              }
            >
              Claim all
            </Button>
            <Grid className="gap-32 ">
              {hydratedCompensationInfoItems?.map((showInfo) => (
                <InputCard key={toPubString(showInfo.ammId)} info={showInfo} />
              ))}
            </Grid>
          </div>
        ) : (
          <div className="text-xl text-[#abc4ff] my-8">you have no compensation</div>
        )
      ) : (
        <Grid className="justify-center">
          <LoadingCircle />
        </Grid>
      )}
    </PageLayout>
  )
}

function InputCard({ info }: { info: HydratedCompensationInfoItem }) {
  const isApprovePanelShown = useAppSettings((s) => s.isApprovePanelShown)
  const isMobile = useAppSettings((s) => s.isMobile)
  return (
    <Col className="gap-8 mobile:gap-4 mx-auto w-full">
      <AutoBox is={isMobile ? 'Col' : 'Row'} className="gap-4 mobile:gap-2 items-end mobile:items-start">
        <Col className="gap-1">
          <Col className="gap-1">
            <div className="title text-3xl mobile:text-xl font-semibold text-[#fff] ">{info.poolName}</div>
            <div className="w-fit">
              <AddressItem showDigitCount={isMobile ? 8 : 12} className="text-[#abc4ff80] text-sm mobile:text-xs">
                {info.ammId}
              </AddressItem>
            </div>
          </Col>
          <div className="text-[#abc4ff80] text-sm mobile:text-xs">
            {toUTC(info.openTime)} - {toUTC(info.endTime)}
          </div>
        </Col>
        <Col className="ml-auto mobile:ml-0 items-end">
          <Fieldset
            name="snapshot lp"
            renderFormItem={<div className="font-semibold text-[#abc4ff]">{toString(info.snapshotLpAmount)} LP</div>}
          />
        </Col>
      </AutoBox>
      <div className="w-full mx-auto">
        <Grid className="grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-[3vw]">
          {info.tokenInfo.map((tokenInfo, idx) => {
            const label = idx === 0 ? 'BASE' : idx === 1 ? 'QUOTE' : 'COMPENSATION'
            if (!tokenInfo) return null
            return (
              <Col key={idx}>
                <Row className="gap-4 justify-center border-b-2 mb-3 pb-1 border-[#abc4ff80]">
                  <div className="text-lg mobile:text-sm text-[#abc4ff]">{label} : </div>
                  <Row className="items-center gap-2">
                    <CoinAvatar token={tokenInfo.token} size="smi" />
                    <div className="text-[#abc4ff80] min-w-[2em]">{tokenInfo.token.symbol ?? '--'}</div>
                  </Row>
                </Row>

                <Fieldset
                  name="per lp loss"
                  renderFormItem={
                    <Row>
                      <div className="text-[#abc4ff80] min-w-[2em] mr-1">{toString(tokenInfo.perLpLoss) ?? ''} </div>
                      <div className="text-white">{tokenInfo.perLpLoss.token.symbol ?? '--'}</div>
                    </Row>
                  }
                />
                <Fieldset
                  name="all loss"
                  renderFormItem={
                    <Row>
                      <div className="text-[#abc4ff80] min-w-[2em] mr-1">
                        {toString(tokenInfo.ownerAllLossAmount) ?? ''}{' '}
                      </div>
                      <div className="text-white">{tokenInfo.ownerAllLossAmount.token.symbol ?? '--'}</div>
                    </Row>
                  }
                />
                <Fieldset
                  name="debt"
                  renderFormItem={
                    <Row>
                      <div className="text-[#abc4ff80] min-w-[2em] mr-1">{toString(tokenInfo.debtAmount) ?? ''} </div>
                      <div className="text-white">{tokenInfo.debtAmount.token.symbol ?? '--'}</div>
                    </Row>
                  }
                />
              </Col>
            )
          })}
        </Grid>

        <Button
          size="lg"
          className="w-full frosted-glass-teal mt-5"
          isLoading={isApprovePanelShown}
          validators={[
            { should: info.canClaim, fallbackProps: { children: toSentenceCase(info.canClaimErrorType ?? 'Claimed') } }
          ]}
          onClick={() => txClaimCompensation({ poolInfo: info })}
        >
          Claim
        </Button>
      </div>
    </Col>
  )
}

function Fieldset({ name, tooltip, renderFormItem }: { name: string; tooltip?: string; renderFormItem: ReactNode }) {
  return (
    <Grid className="grid-cols-[8em,1fr] gap-8">
      <Row className="items-center">
        <div className="text-lg mobile:text-sm text-[#abc4ff]">{name}</div>
        {tooltip && (
          <Tooltip panelClassName="bg-[#3b4146]" arrowClassName="bg-[#3b4146]">
            <Icon size="sm" heroIconName="question-mark-circle" className="mx-1 cursor-help text-[#abc4ff]" />
            <Tooltip.Panel>
              <p className="w-80">{tooltip}</p>
            </Tooltip.Panel>
          </Tooltip>
        )}
        <div className="text-lg  mobile:text-sm text-[#abc4ff]">: </div>
      </Row>
      <div className="justify-self-end mobile:text-sm">{renderFormItem}</div>
    </Grid>
  )
}
