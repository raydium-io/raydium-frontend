import useNotification from '@/application/notification/useNotification'
import { AddressItem } from '@/components/AddressItem'
import { AsyncAwait } from '@/components/AsyncAwait'
import AutoBox from '@/components/AutoBox'
import CoinAvatar from '@/components/CoinAvatar'
import CoinAvatarPair from '@/components/CoinAvatarPair'
import Col from '@/components/Col'
import Grid from '@/components/Grid'
import Icon from '@/components/Icon'
import LoadingCircle from '@/components/LoadingCircle'
import Row from '@/components/Row'
import Tooltip from '@/components/Tooltip'
import { shakeUndifindedItem } from '@/functions/arrayMethods'
import toPubString from '@/functions/format/toMintString'
import toPercentString from '@/functions/format/toPercentString'
import { isToken } from '@/functions/judgers/dateType'
import { minus } from '@/functions/numberish/operations'
import { toString } from '@/functions/numberish/toString'
import { Numberish } from '@/types/constants'
import { MayArray } from '@/types/generics'
import { Token, TokenAmount } from '@raydium-io/raydium-sdk'
import { twMerge } from 'tailwind-merge'
import useAppSettings from '../common/useAppSettings'
import { UserPositionAccount } from '../concentrated/type'
import { getConcentratedPositionFee } from './getConcentratedPositionFee'
import { getTransferFeeInfos } from './getTransferFeeInfos'
import { SplToken } from './type'

type HasConfirmState = Promise<boolean>

const feeItemLabel = {
  harvest: {
    token: (token: Token) => `Harvest Pool ${token.symbol}`,
    reward: (rewardToken: Token) => `Harvest Pool Reward ${rewardToken.symbol}`
  },
  openPosition: {
    token: (token: Token) => `Open Position Pool ${token.symbol}`
  },
  increase: {
    amount: (token: Token) => `Increase User input ${token.symbol}`
  },
  decrease: {
    token: (token: Token) => `Harvest Pool ${token.symbol}`,
    reward: (rewardToken: Token) => `Harvest Pool Reward ${rewardToken.symbol}`,
    amount: (token: Token) => `Decrease User input ${token.symbol}`
  }
}
/**
 * not just data, also ui
 */
export function openToken2022ClmmAmmPoolPositionConfirmPanel({
  caseName,
  position: inputPosition,
  positionAdditionalAmount: additionalAmount,
  onCancel,
  onConfirm
}: {
  caseName: keyof typeof feeItemLabel
  position?: MayArray<UserPositionAccount | undefined>
  positionAdditionalAmount?: TokenAmount[]
  additionalAmountCaseName?: string
  // onlyMints?: (SplToken | Token | PublicKeyish)[]
  onCancel?(): void
  onConfirm?(): void
}): {
  hasConfirmed: HasConfirmState
} {
  let resolve: (value: boolean | PromiseLike<boolean>) => void
  let reject: (reason?: any) => void
  const hasConfirmed = new Promise<boolean>((res, rej) => {
    resolve = res
    reject = rej
  })

  const infos = getConcentratedPositionFee({ positions: inputPosition })
  const amount = inputPosition ? shakeUndifindedItem([additionalAmount].flat()) : undefined
  const amountInfo = amount?.length ? getTransferFeeInfos({ amount }) : undefined
  const combinedPromise = Promise.all([infos, amountInfo])

  useNotification.getState().popConfirm({
    cardWidth: 'lg',
    type: 'warning',
    title: 'Confirm Token 2022',
    description: (
      <div>
        <p className="mb-2">
          This token uses the Token2022 program that is unaudited and still in beta. This is an advanced feature, trade
          with caution.
        </p>
        <p>The Token2022 program includes Extensions, like Transfer Fees. Please confirm below.</p>
      </div>
    ),
    additionalContent: ({ updateConfig }) => (
      <Col className="gap-2 w-full">
        <AsyncAwait
          promise={combinedPromise}
          fallback={<LoadingCircle className="mx-auto" />}
          onFullfilled={([infos, amountFeeInfos]) => {
            updateConfig({
              disableConfirmButton: false,
              disableAdditionalContent: infos.size === 0 && amountFeeInfos?.length === 0
            })
          }}
        >
          {([infos, amountFeeInfos]) => (
            <Col className="space-y-4 max-h-[50vh] overflow-auto">
              {Array.from(infos).map(([position, feeInfos]) => (
                <div key={toPubString(position.nftMint)} className="bg-[#abc4ff1a] rounded-xl">
                  {/* ammPool name */}
                  <PositionHeader position={position} />

                  {/* position info */}
                  <div className="flex-grow px-6 rounded-xl divide-y-1.5 divide-[#abc4ff1a]">
                    {feeInfos.map(({ type, feeInfo }, idx) =>
                      feeInfo ? (
                        <FeeInfoRow
                          type={type}
                          key={type + idx}
                          className="py-4"
                          amount={feeInfo.amount}
                          fee={feeInfo.fee}
                          caseName={caseName}
                        />
                      ) : undefined
                    )}
                    {amountFeeInfos?.map((info, idx) => (
                      <FeeInfoRow
                        type="amount"
                        key={'amount' + idx}
                        className="py-4"
                        amount={info.amount}
                        fee={info.fee}
                        caseName={caseName}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </Col>
          )}
        </AsyncAwait>
      </Col>
    ),
    confirmButtonIsMainButton: true,
    disableConfirmButton: true,
    cancelButtonText: 'Cancel',
    confirmButtonText: 'Confirm',
    onConfirm: () => {
      resolve(true)
      onConfirm?.()
    },
    onCancel: () => {
      resolve(false)
      onCancel?.()
    }
  })

  return { hasConfirmed }
}

export function openToken2022ClmmAmountConfirmPanel(payload: {
  amount: MayArray<TokenAmount | undefined>
  onCancel?(): void
  onConfirm?(): void
}): {
  hasConfirmed: HasConfirmState
} {
  let resolve: (value: boolean | PromiseLike<boolean>) => void
  let reject: (reason?: any) => void
  const hasConfirmed = new Promise<boolean>((res, rej) => {
    resolve = res
    reject = rej
  })
  const feeInfo = getTransferFeeInfos({
    amount: shakeUndifindedItem([payload.amount].flat())
  })

  useNotification.getState().popConfirm({
    cardWidth: 'lg',
    type: 'warning',
    title: 'Confirm Token 2022',
    description: 'balabalabala. Confirm this token before transaction.',
    additionalContent: ({ updateConfig }) => (
      <AsyncAwait promise={feeInfo} onFullfilled={() => updateConfig({ disableConfirmButton: false })}>
        {(feeInfo) =>
          feeInfo && feeInfo.length > 1 ? (
            <div className="space-y-2 text-left w-full">
              {feeInfo.map((info) => (
                <Col key={toPubString(info.amount.token.mint)} className="py-4 gap-1 items-center">
                  <div className="text-lg mobile:text-base font-semibold">{feeInfo[0].amount.token.symbol}</div>
                  <Row className="items-center gap-2">
                    <FormularItem value={toString(info.amount)} unit={info.amount.token} />
                    <FormularOperator operator="-" />
                    <FormularItem value={toString(info.fee)} unit={info.fee?.token} isFee />
                    <FormularOperator operator="=" />
                    <FormularItem
                      value={toString(minus(info.amount, info.fee), {
                        decimalLength: info.amount.token.decimals
                      })}
                      unit={info.amount.token}
                    />
                  </Row>
                </Col>
              ))}
            </div>
          ) : (
            feeInfo && (
              <div className="space-y-2 text-left w-full">
                <Col key={toPubString(feeInfo[0].amount.token.mint)} className="py-4 gap-1 items-center">
                  <div className="text-lg mobile:text-base font-semibold">{feeInfo[0].amount.token.symbol}</div>
                  <Row className="items-center  gap-2">
                    <FormularItem value={toString(feeInfo[0].amount)} unit={feeInfo[0].amount.token} />
                    <FormularOperator operator="-" />
                    <FormularItem value={toString(feeInfo[0].fee)} unit={feeInfo[0].fee?.token} isFee />
                    <FormularOperator operator="=" />
                    <FormularItem
                      value={toString(minus(feeInfo[0].amount, feeInfo[0].fee), {
                        decimalLength: feeInfo[0].amount.token.decimals
                      })}
                      unit={feeInfo[0].amount.token}
                    />
                  </Row>
                </Col>
              </div>
            )
          )
        }
      </AsyncAwait>
    ),
    confirmButtonIsMainButton: true,
    disableConfirmButton: true,
    cancelButtonText: 'Cancel',
    confirmButtonText: 'Confirm',
    onConfirm: () => {
      resolve(true)
      payload.onConfirm?.()
    },
    onCancel: () => {
      resolve(false)
      payload.onCancel?.()
    }
  })

  return { hasConfirmed }
}

function FormularItem({
  value,
  unit,
  isFee
}: {
  value: Numberish
  unit: SplToken | Token | undefined
  isFee?: boolean
}) {
  return (
    <Row className="items-center gap-1">
      <div className="text-white">{toString(value)}</div>
      {isToken(unit) ? (
        <Row>
          <Row className="gap-0.5 text-xs text-[#abc4ff]">
            {isFee && <div>fee</div>}
            <CoinAvatar size="xs" token={unit} />
            <div>{unit.symbol}</div>
          </Row>
        </Row>
      ) : (
        <Row className="gap-0.5 text-xs text-[#abc4ff]">
          {isFee && <div>fee</div>}
          <div>{unit}</div>
        </Row>
      )}
    </Row>
  )
}

function FeeInfoRow({
  name,
  caseName,
  className,
  amount,
  fee,
  type: type
}: {
  name?: string
  caseName?: keyof typeof feeItemLabel
  className?: string
  amount: TokenAmount
  fee?: TokenAmount
  type: 'token' | 'reward' | 'amount'
}) {
  return (
    <Grid className={twMerge('grid-cols-2 mobile:grid-cols-1 gap-4 items-center text-[#abc4ff]', className)}>
      <Col className="gap-3">
        <div className="text-sm">{caseName ? feeItemLabel[caseName]?.[type]?.(amount.token) : undefined}</div>
        <Row className="items-center gap-2">
          <CoinAvatar token={amount.token} size="sm"></CoinAvatar>
          <div className="text-white">
            {toString(minus(amount, fee), { decimalLength: `auto ${amount.token.decimals}` })}
          </div>
          <div>{amount.token.symbol}</div>
        </Row>
      </Col>

      <Row className="gap-2 text-xs flex-wrap justify-between">
        <Col className="gap-4">
          <div className="text-[#abc4ff80]">Initial amount</div>
          <Row className="items-center gap-2">
            <div>{toString(amount)}</div>
            <div>{amount.token.symbol}</div>
          </Row>
        </Col>

        <Col className="gap-4">
          <div className="text-[#abc4ff80]">Token 2022 fee</div>
          <Row className="items-center gap-2">
            <div>{toString(fee ?? 0)}</div>
            <div>{fee?.token.symbol}</div>
          </Row>
        </Col>
      </Row>
    </Grid>
  )
}

function FormularOperator({ operator }: { operator: '+' | '-' | '=' }) {
  return <div className="text-[#abc4ff80] text-xl font-medium">{operator}</div>
}

function PositionHeader({ position }: { position: UserPositionAccount }) {
  const isMobile = useAppSettings((s) => s.isMobile)
  const maxAcceptPriceDecimal = 15
  const maxSignificantCount = (decimals: number) => Math.min(decimals + 2, maxAcceptPriceDecimal)
  const ammPool = position.ammPool
  return (
    <Row className="gap-4 p-4 bg-[#141041] rounded-xl justify-between">
      <AutoBox is={isMobile ? 'Col' : 'Row'} className="clickable flex-wrap items-center mobile:items-start">
        <CoinAvatarPair
          className="justify-self-center mr-2"
          size={isMobile ? 'sm' : 'md'}
          token1={ammPool.base}
          token2={ammPool.quote}
        />
        <Row className="mobile:text-xs font-medium mobile:mt-px items-center flex-wrap gap-2">
          <Col>
            <Row className="items-center text-[#abc4ff]">
              <div className="text-[#fff]">{ammPool.name}</div>
              <Tooltip>
                <Icon iconClassName="ml-1" size="sm" heroIconName="information-circle" />
                <Tooltip.Panel>
                  <div className="max-w-[300px] space-y-1.5">
                    {[ammPool?.base, ammPool?.quote].map((token, idx) =>
                      token ? (
                        <Row key={idx} className="gap-2">
                          <CoinAvatar size={'xs'} token={token} />
                          <AddressItem
                            className="grow"
                            showDigitCount={5}
                            addressType="token"
                            canCopy
                            canExternalLink
                            textClassName="flex text-xs text-[#abc4ff] justify-start "
                            iconClassName="text-[#abc4ff]"
                          >
                            {toPubString(token.mint)}
                          </AddressItem>
                        </Row>
                      ) : null
                    )}
                  </div>
                </Tooltip.Panel>
              </Tooltip>
            </Row>
            <div className="font-medium text-xs text-[#ABC4FF80]">Fee {toPercentString(ammPool.tradeFeeRate)}</div>
          </Col>
        </Row>
      </AutoBox>

      {position && (
        <div>
          <div className="text-xs text-[#abc4ff80] font-medium">My Position</div>
          <Grid className="items-center text-[#abc4ff] mobile:text-sm">
            {toString(position.priceLower, {
              decimalLength: maxAcceptPriceDecimal,
              maxSignificantCount: maxSignificantCount(6)
            })}{' '}
            -{' '}
            {toString(position?.priceUpper, {
              decimalLength: maxAcceptPriceDecimal,
              maxSignificantCount: maxSignificantCount(6)
            })}
          </Grid>
        </div>
      )}
    </Row>
  )
}
