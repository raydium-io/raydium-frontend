import useAppSettings from '@/application/common/useAppSettings'
import txCreateMarket from '@/application/createMarket/txCreateMarket'
import { useCreateMarket } from '@/application/createMarket/useCreateMarket'
import { SplToken } from '@/application/token/type'
import useWallet from '@/application/wallet/useWallet'
import { AddressItem } from '@/components/AddressItem'
import Button from '@/components/Button'
import CoinAvatar from '@/components/CoinAvatar'
import Col from '@/components/Col'
import Grid from '@/components/Grid'
import Icon from '@/components/Icon'
import Input from '@/components/Input'
import PageLayout from '@/components/PageLayout'
import Row from '@/components/Row'
import { isMintEqual } from '@/functions/judgers/areEqual'
import { gt, isMeaningfulNumber } from '@/functions/numberish/compare'
import { toString } from '@/functions/numberish/toString'
import TokenSelectorDialog from '@/pageComponents/dialogs/TokenSelectorDialog'
import { ReactNode, useState } from 'react'

export default function SettingsPage() {
  return (
    <PageLayout mobileBarTitle="Settings" metaTitle="Settings - Raydium" contentButtonPaddingShorter>
      <div className="title text-2xl mobile:text-lg font-semibold justify-self-start text-white mb-4">
        Create Market
      </div>
      <InputCreateMarketCard />
    </PageLayout>
  )
}

function InputCreateMarketCard() {
  const programId = useCreateMarket((s) => s.programId)
  const baseToken = useCreateMarket((s) => s.baseToken)
  const quoteToken = useCreateMarket((s) => s.quoteToken)
  const minimumOrderSize = useCreateMarket((s) => s.minimumOrderSize)
  const tickSize = useCreateMarket((s) => s.tickSize)
  const newCreatedMarketId = useCreateMarket((s) => s.newCreatedMarketId)

  const isApprovePanelShown = useAppSettings((s) => s.isApprovePanelShown)
  const walletConnected = useWallet((s) => s.connected)

  return (
    <Col className="gap-8 mx-auto w-[min(800px,100%)]">
      <Fieldset name="Program id" renderFormItem={<Input disabled value={programId} />} />
      <Fieldset
        name="Select tokens"
        renderFormItem={
          <Grid className="grid-cols-2 gap-4">
            <SelectTokenInputBox
              title="Base Token"
              tokenKey="baseToken"
              onSelectToken={(token) => {
                useCreateMarket.setState({ baseToken: token })
                if (isMintEqual(token.mint, quoteToken?.mint)) {
                  useCreateMarket.setState({ quoteToken: undefined })
                }
              }}
              token={baseToken}
            />
            <SelectTokenInputBox
              title="Quote Token"
              tokenKey="quoteToken"
              onSelectToken={(token) => {
                useCreateMarket.setState({ quoteToken: token })
                if (isMintEqual(token.mint, baseToken?.mint)) {
                  useCreateMarket.setState({ baseToken: undefined })
                }
              }}
              token={quoteToken}
            />
          </Grid>
        }
      />
      <Fieldset
        name="Minimum order size"
        renderFormItem={
          <Input
            className="p-3 rounded-lg bg-[#141041]"
            validators={{ should: (n) => gt(n, 0) }}
            value={toString(minimumOrderSize)}
            onUserInput={(n) => useCreateMarket.setState({ minimumOrderSize: n })}
          />
        }
      />
      <Fieldset
        name="Ticket size"
        renderFormItem={
          <Input
            className="p-3 rounded-lg bg-[#141041]"
            validators={{ should: (n) => gt(n, 0) }}
            value={toString(tickSize)}
            onUserInput={(n) => useCreateMarket.setState({ tickSize: n })}
          />
        }
      />

      {newCreatedMarketId ? (
        <Row className="w-min self-center gap-5 items-center">
          <div className="text-xl mobile:text-base text-[#39d0d8] whitespace-nowrap">Your new market id: </div>
          <AddressItem textClassName="text-lg text-[#fff]" showDigitCount="all" canCopy>
            {newCreatedMarketId}
          </AddressItem>
        </Row>
      ) : (
        <Button
          size="lg"
          className="w-full frosted-glass-teal mt-5"
          isLoading={isApprovePanelShown}
          validators={[
            {
              should: walletConnected,
              forceActive: true,
              fallbackProps: {
                onClick: () => useAppSettings.setState({ isWalletSelectorShown: true }),
                children: 'Connect Wallet'
              }
            },
            {
              should: baseToken,
              fallbackProps: { children: 'Select base token' }
            },
            {
              should: quoteToken,
              fallbackProps: { children: 'Select base token' }
            },
            {
              should: isMeaningfulNumber(minimumOrderSize) && gt(minimumOrderSize, 0),
              fallbackProps: {
                children: 'Should input valid minimum order size'
              }
            },
            {
              should: isMeaningfulNumber(tickSize) && gt(tickSize, 0),
              fallbackProps: { children: 'Should input valid ticket size' }
            }
          ]}
          onClick={txCreateMarket}
        >
          Create Market
        </Button>
      )}
    </Col>
  )
}

function Fieldset({ name, renderFormItem }: { name: string; renderFormItem: ReactNode }) {
  return (
    <Grid className="grid-cols-[12em,1fr] gap-8">
      <div className="justify-self-end text-lg mobile:text-sm text-[#abc4ff]">{name}: </div>
      {renderFormItem}
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
