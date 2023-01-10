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
import Tooltip from '@/components/Tooltip'
import { isMintEqual } from '@/functions/judgers/areEqual'
import { gt, isMeaningfulNumber } from '@/functions/numberish/compare'
import { toString } from '@/functions/numberish/toString'
import TokenSelectorDialog from '@/pageComponents/dialogs/TokenSelectorDialog'
import { ReactNode, useState } from 'react'

/**
 * temporary create-market page
 */

export default function CreateMarketPage() {
  return (
    <PageLayout mobileBarTitle="Create Market" metaTitle="Create Market - Raydium" contentButtonPaddingShorter>
      <div className="title text-2xl mobile:text-lg font-semibold justify-self-start text-white mb-4">
        Create OpenBook Market
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
      <Fieldset
        name="OpenBook Program id"
        renderFormItem={<Input disabled className="pointer-events-none mobile:text-xs" value={programId} />}
      />
      <Fieldset
        name="Select tokens"
        renderFormItem={
          <Grid
            className={`grid-cols-2 ${newCreatedMarketId ? 'opacity-50 pointer-events-none' : ''} gap-4 mobile:gap-2`}
          >
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
        tooltip="This is the smallest allowed order size. For a SOL/USDC market, this would be in units of SOL, a.k.a. the Lot size."
        renderFormItem={
          <Input
            disabled={Boolean(newCreatedMarketId)}
            className={`p-3 ${newCreatedMarketId ? 'opacity-50 pointer-events-none' : ''} rounded-lg bg-[#141041]`}
            validators={{ should: (n) => gt(n, 0) }}
            value={toString(minimumOrderSize)}
            onUserInput={(n) => useCreateMarket.setState({ minimumOrderSize: n })}
          />
        }
      />
      <Fieldset
        name="Minimum price tick size"
        tooltip="This is the smallest amount by which prices can move. For a SOL/USDC market, this would be in units of USDC, a.k.a. the price increment."
        renderFormItem={
          <Input
            disabled={Boolean(newCreatedMarketId)}
            className={`p-3 ${newCreatedMarketId ? 'opacity-50 pointer-events-none' : ''} rounded-lg bg-[#141041]`}
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

function Fieldset({ name, tooltip, renderFormItem }: { name: string; tooltip?: string; renderFormItem: ReactNode }) {
  const isMobile = useAppSettings((s) => s.isMobile)
  return (
    <Grid className="grid-cols-[18em,1fr] mobile:grid-cols-1 gap-8 mobile:gap-4">
      <Row className="justify-self-end mobile:justify-self-start items-center">
        <div className="text-lg mobile:text-sm text-[#abc4ff]">{name}</div>
        {tooltip && (
          <Tooltip panelClassName="bg-[#3b4146]" arrowClassName="bg-[#3b4146]">
            <Icon size="sm" heroIconName="question-mark-circle" className="mx-1 cursor-help text-[#abc4ff]" />
            <Tooltip.Panel>
              <p className="w-80">{tooltip}</p>
            </Tooltip.Panel>
          </Tooltip>
        )}
        <div className="text-lg mobile:hidden text-[#abc4ff]">: </div>
      </Row>
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
  const isMobile = useAppSettings((s) => s.isMobile)
  return (
    <>
      <Grid
        className="grid items-center bg-[#141041] rounded-xl py-2 mobile:py-1.5 cursor-pointer px-3 mobile:px-2"
        onClick={() => setIsSelectorOpen(true)}
      >
        {token ? (
          <div>
            <div className="text-xs mobile:text-2xs text-[#abc4ff80] mb-1">{title}</div>
            <Row className="items-center gap-2 mobile:gap-1">
              <CoinAvatar token={token} size={isMobile ? 'sm' : 'md'} />
              <div className="text-[#abc4ff] font-medium text-lg mobile:text-sm">{token.symbol ?? ''}</div>
              <Icon size={isMobile ? 'xs' : 'sm'} className="text-[#abc4ff] ml-auto mr-4" heroIconName="chevron-down" />
            </Row>
          </div>
        ) : (
          <Row className="text-[#abc4ff80] text-center gap-1.5 items-center px-3 py-2">
            <div className="text-base mobile:text-xs">{title}</div>
            <Icon size={isMobile ? 'xs' : 'sm'} className="text-[#abc4ff80] ml-auto mr-4" heroIconName="chevron-down" />
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
