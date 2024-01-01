import { useRouter } from 'next/router'
import { ReactNode, useMemo, useState } from 'react'
import { twMerge } from 'tailwind-merge'

import useAppAdvancedSettings from '@/application/common/useAppAdvancedSettings'
import useAppSettings from '@/application/common/useAppSettings'
import useConnection from '@/application/connection/useConnection'
import txCreateAndInitNewPool from '@/application/createPool/txCreateAndInitNewPool'
import { updateCreatePoolInfo } from '@/application/createPool/updateCreatePoolInfo'
import useCreatePool from '@/application/createPool/useCreatePool'
import useInitlyGetCreatedPoolExhibitionData from '@/application/createPool/useInitlyGetCreatedPoolExhibitionData'
import { routeTo } from '@/application/routeTools'
import useToken from '@/application/token/useToken'
import { createSplToken } from '@/application/token/useTokenListsLoader'
import useWallet from '@/application/wallet/useWallet'
import Button from '@/components/Button'
import Card from '@/components/Card'
import CoinInputBox from '@/components/CoinInputBox'
import Col from '@/components/Col'
import Collapse from '@/components/Collapse'
import DateInput from '@/components/DateInput'
import Icon from '@/components/Icon'
import InputBox from '@/components/InputBox'
import Link from '@/components/Link'
import PageLayout from '@/components/PageLayout'
import Row from '@/components/Row'
import SetpIndicator from '@/components/SetpIndicator'
import Tooltip from '@/components/Tooltip'
import copyToClipboard from '@/functions/dom/copyToClipboard'
import { toTokenAmount } from '@/functions/format/toTokenAmount'
import { isMeaningfulNumber, lte } from '@/functions/numberish/compare'
import { div } from '@/functions/numberish/operations'
import { toString } from '@/functions/numberish/toString'
import useAsyncMemo from '@/hooks/useAsyncMemo'
import useToggle from '@/hooks/useToggle'
import { Liquidity, struct, u64 } from '@raydium-io/raydium-sdk'
import { getMaxBalanceBNIfNotATA } from '../../application/token/getMaxBalanceIfNotATA'

/**
 * @see https://uiwjs.github.io/#/components/date-input
 */
export default function CreatePoolPage() {
  return (
    <PageLayout metaTitle="Create Liquidity Pool - Raydium" mobileBarTitle="Create Pool">
      <PanelContent close={() => routeTo('/liquidity/add')} />
      <UserCreatedPoolsExhibitionPanel />
    </PageLayout>
  )
}
function PanelContent({ close }: { close(): void }) {
  const walletConnected = useWallet((s) => s.connected)
  const getToken = useToken((s) => s.getToken)
  // const { currentStep, setCurrentStep } = usePageData()
  const currentStep = useCreatePool((s) => s.currentStep)
  const setCurrentStep = useCreatePool((s) => s.setCurrentStep)
  const isApprovePanelShown = useAppSettings((s) => s.isApprovePanelShown)
  const [isLoading, setIsLoading] = useState(false)

  const {
    marketId,
    ammId,
    baseMint,
    quoteMint,
    baseDecimals,
    quoteDecimals,
    baseDecimaledAmount: baseAmount,
    quoteDecimaledAmount: quoteAmount
  } = useCreatePool()

  const step1Content = (
    <>
      {/* text */}
      <div className="my-12 mobile:my-6 italic text-center text-sm font-medium text-[rgba(171,196,255,.5)]">
        This tool is for advanced users. Before attempting to create a new liquidity pool, we suggest going through this{' '}
        <Link href="https://raydium.gitbook.io/raydium/permissionless/creating-a-pool">detailed guide</Link>
      </div>
      <InputBox
        label="OpenBook Market ID:"
        className="mb-5"
        onUserInput={(value) => useCreatePool.setState({ marketId: value })}
      />
      <Button
        className="frosted-glass-teal w-full"
        isLoading={isLoading}
        validators={[
          { should: Boolean(marketId) },
          {
            should: walletConnected,
            forceActive: true,
            fallbackProps: {
              onClick: () => useAppSettings.setState({ isWalletSelectorShown: true }),
              children: 'Connect Wallet'
            }
          }
        ]}
        onClick={() => {
          setIsLoading(true)
          updateCreatePoolInfo({ marketId: marketId! })
            .then(({ isSuccess }) => {
              if (isSuccess) setCurrentStep(2)
            })
            .finally(() => setIsLoading(false))
        }}
      >
        Confirm
      </Button>
    </>
  )

  const baseToken = baseMint
    ? getToken(baseMint) ??
      (baseDecimals != null ? createSplToken({ mint: baseMint, decimals: baseDecimals }) : undefined)
    : undefined
  const quoteToken = quoteMint
    ? getToken(quoteMint) ??
      (quoteDecimals != null ? createSplToken({ mint: quoteMint, decimals: quoteDecimals }) : undefined)
    : undefined
  // if have ata use ata, if not ,use max account in wallet
  const baseTokenBalance = useMemo(
    () => (baseToken ? toTokenAmount(baseToken, getMaxBalanceBNIfNotATA(baseToken.mint)) : undefined),
    [baseToken]
  )
  const quoteTokenBalance = useMemo(
    () => (quoteToken ? toTokenAmount(quoteToken, getMaxBalanceBNIfNotATA(quoteToken.mint)) : undefined),
    [quoteToken]
  )

  const haveEnoughCoinBase = baseAmount && baseTokenBalance && lte(baseAmount, baseTokenBalance)
  const haveEnoughCoinQuote = quoteAmount && quoteTokenBalance && lte(quoteAmount, quoteTokenBalance)

  const [priceReverse, { toggle }] = useToggle()
  const solCost = useCreatePoolSOLCost()

  const step2Content = (
    <>
      {/* text */}
      {/* info panel */}
      <Col className="my-12 mobile:my-6 py-4 px-6 flex-grow ring-inset ring-1.5 ring-[rgba(171,196,255,.5)] rounded-xl items-center gap-3 mobile:gap-1">
        <AddressItem fieldName="OpenBook Market ID:" fieldValue={marketId ?? '--'} />
        <AddressItem fieldName="Base Token Mint Address:" fieldValue={baseMint ?? '--'} autoShowTokenSymbol />
        <AddressItem fieldName="Quote Token Mint Address:" fieldValue={quoteMint ?? '--'} autoShowTokenSymbol />
        <AddressItem fieldName="AMM ID:" fieldValue={ammId ?? '--'} />
      </Col>

      {baseAmount && quoteAmount && isMeaningfulNumber(baseAmount) && isMeaningfulNumber(quoteAmount) && (
        <Row className="mx-auto my-2 items-center gap-2">
          <div className="text-sm text-[rgb(171,196,255)]">price:</div>
          <div className="text-sm text-white">
            {toString(priceReverse ? div(quoteAmount || 0, baseAmount || 1) : div(baseAmount || 0, quoteAmount || 1), {
              decimalLength: `auto ${Math.max(baseToken?.decimals ?? 6, quoteToken?.decimals ?? 6)}`
            })}
          </div>
          <div className="text-sm text-white">
            {priceReverse ? quoteToken?.symbol : baseToken?.symbol} /{' '}
            {priceReverse ? baseToken?.symbol : quoteToken?.symbol}
          </div>

          <Icon
            heroIconName="switch-horizontal"
            className="clickable clickable-mask-offset-2"
            size="sm"
            onClick={toggle}
          ></Icon>
        </Row>
      )}

      <CoinInputBox
        topLeftLabel="Base Token Initial Liquidity:"
        className="mb-5"
        token={baseToken}
        maxValue={baseTokenBalance}
        onUserInput={(inputText) => useCreatePool.setState({ baseDecimaledAmount: inputText })}
      />
      <CoinInputBox
        topLeftLabel="Quote Token Initial Liquidity:"
        className="mb-5"
        token={quoteToken}
        maxValue={quoteTokenBalance}
        onUserInput={(inputText) => useCreatePool.setState({ quoteDecimaledAmount: inputText })}
      />
      <DateInput
        className="mb-5"
        label="Start time (Optional):"
        canEditSeconds
        onDateChange={(selectedDate) => useCreatePool.setState({ startTime: selectedDate })}
        showTime={{ format: 'HH:mm:ss' }}
      />
      <Row className="text-xs font-medium text-[#D6CC56] bg-[#D6CC5620] py-3 px-4 rounded-xl mb-5">
        A creation fee of {solCost ?? '--'} SOL is required for new pools
        <Tooltip>
          <Icon iconClassName="ml-1" size="sm" heroIconName="information-circle" />
          <Tooltip.Panel>
            <div className="max-w-[300px] space-y-1.5">
              Pool creation fee ensures lookup table support for optimized pool indexing, swap routing, and API
              functionality.
            </div>
          </Tooltip.Panel>
        </Tooltip>
      </Row>

      <Button
        className="frosted-glass-teal w-full"
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
          { should: Boolean(baseAmount && quoteAmount) },
          {
            should: haveEnoughCoinBase,
            fallbackProps: { children: `Insufficient ${baseToken?.symbol ?? ''} balance` }
          },
          {
            should: haveEnoughCoinQuote,
            fallbackProps: { children: `Insufficient ${quoteToken?.symbol ?? ''} balance` }
          }
        ]}
        onClick={() => {
          txCreateAndInitNewPool({
            onAllSuccess: () => {
              setCurrentStep(3)
              setTimeout(() => {
                setCurrentStep(1)
              }, 8000)
            }
          })
        }}
      >
        Initialize Liquidity Pool
      </Button>
    </>
  )
  const step3Content = (
    <>
      {/* text */}
      {/* info panel */}
      <Col className="my-12 mobile:my-6 py-4 px-6 flex-grow ring-inset ring-1.5 ring-[rgba(171,196,255,.5)] rounded-xl items-center gap-3 mobile:gap-1">
        <AddressItem fieldName="OpenBook Market ID:" fieldValue={marketId ?? '--'} />
        <AddressItem fieldName="AMM ID:" fieldValue={ammId ?? '--'} />
        <AddressItem fieldName="Base Mint:" fieldValue={baseMint ?? '--'} autoShowTokenSymbol />
        <AddressItem fieldName="Quote Mint:" fieldValue={quoteMint ?? '--'} autoShowTokenSymbol />
        {/* <InfoItem fieldName="Tick Size:" fieldValue={0.0001} />
        <InfoItem fieldName="Min Order Size:" fieldValue={0.01} />
        <InfoItem fieldName="Current Prize:" fieldValue={0.0551} />
        <InfoItem fieldName="Base Token Starting Price:" fieldValue={baseTokenStartingPrice} />
        <InfoItem fieldName="Base Token Initial Liquidity:" fieldValue={baseTokenInitialLiquidity} />
      <InfoItem fieldName="Quote Token Initial Liquidity:" fieldValue={quoteTokenInitialLiquidity} /> */}
      </Col>

      <div className="font-medium text-center">Pool has been successfully created!</div>

      <Col className="my-6 mobile:my-6 py-4 px-6 flex-grow ring-inset ring-1.5 ring-[rgba(171,196,255,.5)] rounded-xl items-center gap-3 mobile:gap-1">
        <InfoItem
          fieldName="AMM ID:"
          fieldValue={
            <Row>
              <Link className="text-sm" href={`/liquidity/add/?ammId=${ammId}`} onClick={close}>
                {ammId?.slice(0, 12) + '......' + ammId?.slice(-12)}
              </Link>
              <Icon
                size="sm"
                heroIconName="clipboard-copy"
                className="clickable text-[#ABC4FF] ml-2"
                onClick={() => {
                  if (ammId) copyToClipboard(ammId)
                }}
              />
            </Row>
          }
        />
      </Col>
    </>
  )

  return (
    <div className="self-center w-[min(456px,90vw)]">
      <div className="pb-8 text-2xl mobile:text-lg font-semibold justify-self-start text-white">Create Pool</div>
      <Card
        className="p-8 mobile:p-4 flex flex-col rounded-3xl border-1.5 border-[rgba(171,196,255,0.2)] overflow-y-auto overflow-x-hidden bg-cyberpunk-card-bg shadow-cyberpunk-card"
        size="lg"
      >
        {/* step indicator */}
        <SetpIndicator
          currentStep={currentStep}
          stepInfos={[
            {
              stepNumber: 1,
              stepContent: 'Import OpenBook Market ID'
            },
            {
              stepNumber: 2,
              stepContent: 'Price & Initial Liquidity'
            },
            {
              stepNumber: 3,
              stepContent: 'Pool Created'
            }
          ]}
          onSetCurrentSetp={({ stepNumber }) => setCurrentStep?.(stepNumber)}
        ></SetpIndicator>

        {currentStep === 1 && step1Content}
        {currentStep === 2 && step2Content}
        {currentStep === 3 && step3Content}
      </Card>
    </div>
  )
}

function InfoItem({
  autoShowTokenSymbol,
  className,
  fieldName,
  fieldValue
}: {
  autoShowTokenSymbol?: boolean
  className?: string
  fieldName?: ReactNode
  fieldValue?: ReactNode
}) {
  const getToken = useToken((s) => s.getToken)
  const mintSearch = (mint: string) => {
    const token = getToken(mint)
    if (!token) return mint
    else return `${mint} (${token.symbol})`
  }

  return (
    <Row className={twMerge('w-full justify-between', className)}>
      <Row className="items-center text-xs font-medium text-[#ABC4FF] mobile:text-2xs">
        <div className="mr-1">{fieldName}</div>
      </Row>
      <div className="text-xs font-medium text-white mobile:text-2xs">
        {autoShowTokenSymbol ? mintSearch(String(fieldValue)) ?? fieldValue : fieldValue}
      </div>
    </Row>
  )
}

function AddressItem({
  autoShowTokenSymbol,
  className,
  fieldName,
  fieldValue
}: {
  autoShowTokenSymbol?: boolean
  className?: string
  fieldName?: ReactNode
  fieldValue: string
}) {
  const getToken = useToken((s) => s.getToken)
  const mintSearch = (mint: string) => {
    const token = getToken(mint)
    if (!token) return undefined
    else return `(${token.symbol})`
  }
  const shortAddress = useMemo(() => fieldValue.slice(0, 6) + '......' + fieldValue.slice(-6), [fieldValue])
  return (
    <InfoItem
      className={className}
      fieldName={fieldName}
      fieldValue={
        <Row>
          <div title={fieldValue}>
            {shortAddress} {autoShowTokenSymbol && mintSearch(String(fieldValue))}
          </div>
          <Icon
            size="sm"
            heroIconName="clipboard-copy"
            className="clickable text-[#ABC4FF] ml-2"
            onClick={() => {
              copyToClipboard(fieldValue)
            }}
          />
        </Row>
      }
    />
  )
}

function UserCreatedPoolsExhibitionPanel() {
  const { push } = useRouter()
  const getToken = useToken((s) => s.getToken)
  const owner = useWallet((s) => s.owner)
  const createdPoolHistory = useCreatePool((s) => s.createdPoolHistory)
  const userExhibitionHistory = useMemo(() => owner && createdPoolHistory?.[String(owner)], [createdPoolHistory, owner])

  useInitlyGetCreatedPoolExhibitionData()

  if (!userExhibitionHistory?.length) return null
  return (
    <div className="self-center w-[min(456px,90vw)] mt-12">
      <div className="pb-8 text-xl mobile:text-base font-semibold justify-self-start text-white">Your Created Pool</div>
      <Card className="p-4 bg-cyberpunk-card-bg" size="lg">
        <Col className={`gap-6 mobile:gap-5`}>
          {userExhibitionHistory.map((info, idx) => (
            <Collapse
              key={idx}
              className="py-4 px-6 ring-inset ring-1.5 ring-[rgba(171,196,255,.5)] rounded-2xl mobile:rounded-xl"
            >
              <Collapse.Face>
                {({ isOpen }) => (
                  <Row className="items-center justify-between">
                    <Row className="gap-2 items-center">
                      <div className="text-base font-normal text-[#abc4ff]">
                        AMM ID: {info.ammId.slice(0, 6)}...{info.ammId.slice(-6)}
                      </div>
                    </Row>
                    <Icon
                      size="sm"
                      className="text-[#abc4ff]"
                      heroIconName={`${isOpen ? 'chevron-up' : 'chevron-down'}`}
                    />
                  </Row>
                )}
              </Collapse.Face>
              <Collapse.Body>
                <Col className="border-t-1.5 border-[rgba(171,196,255,.5)] mt-4 py-5 gap-3">
                  <AddressItem fieldName="Amm Id: " fieldValue={info.ammId} />
                  <AddressItem fieldName="Market Id: " fieldValue={info.marketId} />
                  <AddressItem fieldName="Base Mint: " fieldValue={info.baseMint} autoShowTokenSymbol />
                  <AddressItem fieldName="Quote Mint: " fieldValue={info.quoteMint} autoShowTokenSymbol />
                  <InfoItem fieldName="Created On: " fieldValue={info.timestamp} />
                </Col>
                <Row className="gap-4 mb-1">
                  <Button
                    className="text-base font-medium frosted-glass frosted-glass-teal rounded-xl flex-grow"
                    onClick={() => {
                      push(`/liquidity/add/?ammId=${info.ammId}`)
                    }}
                  >
                    Add Liquidity
                  </Button>
                </Row>
              </Collapse.Body>
            </Collapse>
          ))}
        </Col>
      </Card>
    </div>
  )
}

/**
 * async hook
 * used in sol cost alert
 * @author Rudy
 */
function useCreatePoolSOLCost(): number | undefined {
  const programIds = useAppAdvancedSettings((s) => s.programIds)
  const connection = useConnection((s) => s.connection)
  const cost = useAsyncMemo(async () => {
    const data = (
      await connection?.getAccountInfo(Liquidity.getAssociatedConfigId({ programId: programIds.AmmV4 }), {
        dataSlice: { offset: 536, length: 8 }
      })
    )?.data
    return data
      ? struct([u64('fee')])
          .decode(data)
          .fee.toNumber() /
          10 ** 9
      : undefined
  }, [connection, programIds.AmmV4])
  return cost
}
