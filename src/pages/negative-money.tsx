import useAppSettings from '@/application/common/useAppSettings'
import { txClaimNegativeMoney } from '@/application/negativeMoney/txNegativeMoney'
import { HydratedShowInfoItem } from '@/application/negativeMoney/type'
import { useNegativeMoney } from '@/application/negativeMoney/useNegativeMoney'
import useNegativeMoneyInfoLoader from '@/application/negativeMoney/useNegativeMoneyInfoLoader'
import { SplToken } from '@/application/token/type'
import { AddressItem } from '@/components/AddressItem'
import Button from '@/components/Button'
import CoinAvatar from '@/components/CoinAvatar'
import Col from '@/components/Col'
import Grid from '@/components/Grid'
import Icon from '@/components/Icon'
import PageLayout from '@/components/PageLayout'
import Row from '@/components/Row'
import Tooltip from '@/components/Tooltip'
import toPubString from '@/functions/format/toMintString'
import { toString } from '@/functions/numberish/toString'
import TokenSelectorDialog from '@/pageComponents/dialogs/TokenSelectorDialog'
import { ReactNode, useState } from 'react'

/**
 * temporary pay money to user for be hacked by hacker page
 */

export default function TemporaryPage() {
  useNegativeMoneyInfoLoader()
  const { dataLoaded, showInfos } = useNegativeMoney()

  return (
    <PageLayout mobileBarTitle="Sorry" metaTitle="Sorry - Raydium" contentButtonPaddingShorter>
      <div className="title text-2xl mobile:text-lg font-semibold justify-self-start text-white mb-4">
        Negative Money
      </div>
      <div className="font-semibold justify-self-start text-[#abc4ff] mb-4">
        OK, here is the money. Please send a tx to get the money.
      </div>
      <Grid className="gap-48 py-24">
        {showInfos?.map((showInfo) => (
          <InputCard key={toPubString(showInfo.ammId)} info={showInfo} />
        ))}
      </Grid>
    </PageLayout>
  )
}

function InputCard({ info }: { info: HydratedShowInfoItem }) {
  const isApprovePanelShown = useAppSettings((s) => s.isApprovePanelShown)
  return (
    <Col className="gap-8 mx-auto w-full">
      <Row className="gap-4">
        <Col>
          <div className="title text-3xl mobile:text-lg font-semibold text-[#fff] ">{info.poolName}</div>
          <AddressItem showDigitCount="all" className="text-[#abc4ff80]">
            {info.ammId}
          </AddressItem>
        </Col>
        <div className="ml-auto">
          <Fieldset
            name="snapshot lp amount"
            renderFormItem={<div className="font-semibold text-[#abc4ff]">{toString(info.snapshotLpAmount)} lp</div>}
          />
        </div>
      </Row>
      <div className="max-w-[1200px] mx-auto">
        <Grid className="grid-cols-3-fr gap-8">
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
                  name="debt amount"
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
          validators={[{ should: info.canClaim, fallbackProps: { children: 'Claimed' } }]}
          onClick={() => txClaimNegativeMoney({ poolInfo: info })}
        >
          Claim
        </Button>
      </div>
    </Col>
  )
}

function Fieldset({ name, tooltip, renderFormItem }: { name: string; tooltip?: string; renderFormItem: ReactNode }) {
  return (
    <Grid className="grid-cols-[12em,1fr] gap-8">
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
      <div className="justify-self-end">{renderFormItem}</div>
    </Grid>
  )
}

function SelectTokenInputBox({
  tokenKey,
  title,
  token,
  disableTokens,
  onSelectToken
}: {
  tokenKey?: string
  title?: string
  token?: SplToken
  disableTokens?: SplToken[]
  onSelectToken?: (token: SplToken, tokenKey?: string) => void
}) {
  const [isSelectorOpen, setIsSelectorOpen] = useState(false)
  return (
    <>
      <Grid
        className="grid items-center bg-[#141041] rounded-xl py-2 cursor-pointer px-3"
        onClick={() => setIsSelectorOpen(true)}
      >
        {token ? (
          <div>
            <div className="text-xs text-[#abc4ff80] mb-1">{title}</div>
            <Row className="items-center gap-2">
              <CoinAvatar token={token} />
              <div className="text-[#abc4ff] font-medium text-lg">{token.symbol ?? ''}</div>
              <Icon size="sm" className="text-[#abc4ff] ml-auto mr-4" heroIconName="chevron-down" />
            </Row>
          </div>
        ) : (
          <Row className="text-[#abc4ff80] text-center gap-1.5 items-center px-3 py-2">
            <div>{title}</div>
            <Icon size="sm" className="text-[#abc4ff80] ml-auto mr-4" heroIconName="chevron-down" />
          </Row>
        )}
      </Grid>
      <TokenSelectorDialog
        open={isSelectorOpen}
        onClose={() => {
          setIsSelectorOpen(false)
        }}
        disableTokens={disableTokens}
        onSelectToken={(token) => {
          onSelectToken?.(token, tokenKey)
        }}
      />
    </>
  )
}
