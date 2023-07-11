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
import { minus } from '@/functions/numberish/operations'
import { toString } from '@/functions/numberish/toString'
import { Numberish } from '@/types/constants'
import { MayArray } from '@/types/generics'
import { Token, TokenAmount } from '@raydium-io/raydium-sdk'
import { twMerge } from 'tailwind-merge'
import useAppSettings from '../common/useAppSettings'
import { HydratedConcentratedInfo, UserPositionAccount } from '../concentrated/type'
import { getConcentratedPositionFee } from './getConcentratedPositionFee'
import { getTransferFeeInfos } from './getTransferFeeInfos'
import { shrinkToValue } from '@/functions/shrinkToValue'

type HasConfirmState = Promise<boolean>
type Label = Record<
  'harvest' | 'openPosition' | 'increase' | 'decrease',
  Partial<Record<'token' | 'reward' | 'amount', ((token: Token) => string) | string>>
>
const primaryFeeItemLabel: Label = {
  harvest: {
    token: (token: Token) => `Harvest Pool ${token.symbol}`,
    reward: (token: Token) => `Harvest Pool Reward ${token.symbol}`
  },
  openPosition: {
    amount: (token: Token) => `Open Position Input ${token.symbol}`
  },
  increase: {
    amount: (token: Token) => `Increase User input ${token.symbol}`
  },
  decrease: {
    token: (token: Token) => `Harvest Pool ${token.symbol}`,
    reward: (token: Token) => `Harvest Pool Reward ${token.symbol}`,
    amount: (token: Token) => `Decrease User input ${token.symbol}`
  }
}

const secondaryFeeItemLabel: Label = {
  harvest: {
    token: (token: Token) => `Harvest Pool ${token.symbol}`,
    reward: (token: Token) => `Harvest Pool Reward ${token.symbol}`
  },
  openPosition: {
    amount: (token: Token) => `Open Position Input ${token.symbol}`
  },
  increase: {
    amount: (token: Token) => `Increase User input ${token.symbol}`
  },
  decrease: {
    token: (token: Token) => `Harvest Pool ${token.symbol}`,
    reward: (token: Token) => `Harvest Pool Reward ${token.symbol}`,
    amount: (token: Token) => `Decrease User input ${token.symbol}`
  }
}

/**
 * not just data, also ui
 */
export function openToken2022ClmmPositionConfirmPanel({
  caseName,
  position: inputPosition,
  positionAdditionalAmount: additionalAmount,
  onCancel,
  onConfirm
}: {
  caseName: keyof typeof primaryFeeItemLabel
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
    title: 'Confirm Token2022',
    description: (
      <div>
        <p className="mb-2 text-center">
          This token uses the Token2022 program, which is unaudited and still in beta. The token may include extensions,
          such as transfer fees. Confirm that you understand the risks and interact with caution.
        </p>
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
                  <PositionHeader
                    ammPool={position.ammPool}
                    priceLower={position.priceLower}
                    priceUpper={position.priceUpper}
                  />

                  {/* position info */}
                  <div className="flex-grow px-4 rounded-xl divide-y-1.5 divide-[#abc4ff1a]">
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

export function openToken2022ClmmAmountConfirmPanel({
  amount,
  onCancel,
  onConfirm,
  caseName,
  groupInfo
}: {
  caseName?: keyof typeof primaryFeeItemLabel
  groupInfo?: {
    ammPool: HydratedConcentratedInfo
    priceLower: Numberish
    priceUpper: Numberish
  }
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
    amount: shakeUndifindedItem([amount].flat())
  })

  useNotification.getState().popConfirm({
    cardWidth: 'lg',
    type: 'warning',
    title: 'Confirm Token2022',
    description: (
      <div>
        <p className="mb-2 text-center">
          This token uses the Token2022 program, which is unaudited and still in beta. The token may include extensions,
          such as transfer fees. Confirm that you understand the risks and interact with caution.
        </p>
      </div>
    ),
    additionalContent: ({ updateConfig }) => (
      <AsyncAwait promise={feeInfo} onFullfilled={() => updateConfig({ disableConfirmButton: false })}>
        {(feeInfo) =>
          feeInfo && groupInfo ? (
            <div className="bg-[#abc4ff1a] rounded-xl">
              {/* ammPool name */}
              <PositionHeader
                ammPool={groupInfo.ammPool}
                priceLower={groupInfo.priceLower}
                priceUpper={groupInfo.priceUpper}
              />

              {/* position info */}
              <div className="flex-grow px-4 rounded-xl divide-y-1.5 divide-[#abc4ff1a]">
                {feeInfo.map((info, idx) =>
                  info ? (
                    <FeeInfoRow
                      type="amount"
                      key={idx}
                      className="py-4"
                      amount={info.amount}
                      fee={info.fee}
                      caseName={caseName}
                    />
                  ) : undefined
                )}
              </div>
            </div>
          ) : (
            feeInfo && (
              <div className="space-y-2 text-left w-full">
                {feeInfo.map((info) => (
                  <div key={toPubString(info.amount.token.mint)} className="bg-[#abc4ff1a] rounded-xl px-4">
                    <FeeInfoRow
                      type="amount"
                      className="py-4"
                      amount={info.amount}
                      fee={info.fee}
                      caseName={caseName}
                    />
                  </div>
                ))}
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
      onConfirm?.()
    },
    onCancel: () => {
      resolve(false)
      onCancel?.()
    }
  })

  return { hasConfirmed }
}

function FeeInfoRow({
  caseName,
  className,
  amount,
  fee,
  type: type
}: {
  caseName?: keyof typeof primaryFeeItemLabel
  className?: string
  amount: TokenAmount
  fee?: TokenAmount
  type?: 'token' | 'reward' | 'amount'
}) {
  return (
    <Grid className={twMerge('grid-cols-2 mobile:grid-cols-1 gap-4 items-center text-[#abc4ff]', className)}>
      <Col className="gap-3">
        <div className="text-sm">
          {caseName && type
            ? shrinkToValue(primaryFeeItemLabel[caseName]?.[type], [amount.token])
            : amount.token.symbol}
        </div>
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
          <div className="text-[#abc4ff80]">
            {caseName && type
              ? shrinkToValue(secondaryFeeItemLabel[caseName]?.[type], [amount.token])
              : 'Initial amount'}
          </div>
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

function PositionHeader({
  ammPool,
  priceLower,
  priceUpper
}: {
  ammPool: Omit<HydratedConcentratedInfo, 'userPositionAccount'>
  priceLower: Numberish
  priceUpper?: Numberish
}) {
  const isMobile = useAppSettings((s) => s.isMobile)
  const maxAcceptPriceDecimal = 15
  const maxSignificantCount = (decimals: number) => Math.min(decimals + 2, maxAcceptPriceDecimal)
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

      {priceLower ? (
        <div>
          <div className="text-xs text-[#abc4ff80] font-medium">My Position</div>
          <Grid className="items-center text-[#abc4ff] mobile:text-sm">
            {toString(priceLower, {
              decimalLength: maxAcceptPriceDecimal,
              maxSignificantCount: maxSignificantCount(6)
            })}{' '}
            -{' '}
            {toString(priceUpper, {
              decimalLength: maxAcceptPriceDecimal,
              maxSignificantCount: maxSignificantCount(6)
            })}
          </Grid>
        </div>
      ) : undefined}
    </Row>
  )
}
