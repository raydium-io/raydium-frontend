import useNotification from '@/application/notification/useNotification'
import { AddressItem } from '@/components/AddressItem'
import { AsyncAwait } from '@/components/AsyncAwait'
import AutoBox from '@/components/AutoBox'
import CoinAvatar from '@/components/CoinAvatar'
import CoinAvatarPair from '@/components/CoinAvatarPair'
import Col from '@/components/Col'
import Grid from '@/components/Grid'
import Icon from '@/components/Icon'
import Row from '@/components/Row'
import Tooltip from '@/components/Tooltip'
import { shakeUndifindedItem } from '@/functions/arrayMethods'
import toPubString from '@/functions/format/toMintString'
import toPercentString from '@/functions/format/toPercentString'
import { isToken } from '@/functions/judgers/dateType'
import { isMeaningfulNumber } from '@/functions/numberish/compare'
import { minus } from '@/functions/numberish/operations'
import { toString } from '@/functions/numberish/toString'
import { Numberish } from '@/types/constants'
import { MayArray } from '@/types/generics'
import { Token, TokenAmount } from '@raydium-io/raydium-sdk'
import useAppSettings from '../common/useAppSettings'
import { HydratedConcentratedInfo, UserPositionAccount } from '../concentrated/type'
import { getConcentratedPositionFee } from './getConcentratedPositionFee'
import { getTransferFeeInfos } from './getTransferFeeInfos'
import { SplToken } from './type'

type HasConfirmState = Promise<boolean>

/**
 * not just data, also ui
 */
export function openToken2022ClmmAmmPoolPositionConfirmPanel({
  ammPool,
  position: inputPosition,
  additionalAmount,
  onCancel,
  onConfirm
}: {
  ammPool: MayArray<HydratedConcentratedInfo | undefined>
  position?: MayArray<UserPositionAccount | undefined>
  additionalAmount?: TokenAmount[]
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

  const infos = getConcentratedPositionFee({ ammPool: ammPool /*  checkMints: onlyMints  */ }).then((s) => s)
  const amount = inputPosition ? shakeUndifindedItem([additionalAmount].flat()) : undefined
  const amountInfo = amount?.length ? getTransferFeeInfos({ amount }).then((a) => a) : undefined
  const combinedPromise = Promise.all([infos, amountInfo])

  useNotification.getState().popConfirm({
    cardWidth: 'lg',
    type: 'warning',
    title: 'Confirm Token 2022',
    description: '🚧💄🚧🚧🚧. Confirm this token before transaction.',
    additionalContent: ({ updateConfig }) => (
      <div className="space-y-2 text-left w-full">
        <AsyncAwait
          promise={combinedPromise}
          fallback="loading..."
          onFullfilled={([infos, amountFeeInfos]) => {
            updateConfig({
              disableConfirmButton: false,
              disableAdditionalContent: infos.size === 0 && amountFeeInfos?.length === 0
            })
          }}
        >
          {([infos, amountFeeInfos]) => (
            <Col className="space-y-4 max-h-[50vh] overflow-auto">
              {/* amm pool info */}
              {Array.from(infos).map(([pool, positionMap]) => (
                <div key={toPubString(pool.id)} className="flex items-center justify-between overflow-auto">
                  <div className="text-sm w-full">
                    {Array.from(positionMap).map(([position, feeInfos]) => {
                      const positionCanSee = inputPosition
                        ? [inputPosition]
                            .flat()
                            .find((p) => p && toPubString(p.nftMint) === toPubString(position.nftMint))
                        : true
                      return (
                        positionCanSee && (
                          <div key={toPubString(position.nftMint)} className="py-2">
                            {/* ammPool name */}
                            <div className="py-2">
                              <CoinAvatarInfoItem ammPool={pool} position={position} />
                            </div>

                            {/* position info */}
                            <div className="flex-grow px-6 border-1.5 border-[rgba(171,196,255,.5)] rounded-xl">
                              {feeInfos.map(({ type, feeInfo }, idx) =>
                                feeInfo && isMeaningfulNumber(feeInfo?.amount) ? (
                                  <Col key={type + idx} className="py-4 gap-1 items-center">
                                    <div className="text-lg mobile:text-base font-semibold">
                                      {feeInfo.amount.token.symbol}
                                    </div>
                                    <Row className="items-center gap-2 flex-wrap">
                                      <FormularItem value={toString(feeInfo.amount)} unit={feeInfo.amount.token} />
                                      <FormularOperator operator="-" />
                                      <FormularItem value={toString(feeInfo.fee)} unit={feeInfo.fee?.token} isFee />
                                      <FormularOperator operator="=" />
                                      <FormularItem
                                        value={toString(minus(feeInfo.amount, feeInfo.fee), {
                                          decimalLength: feeInfo.amount.token.decimals
                                        })}
                                        unit={feeInfo.amount.token}
                                      />
                                    </Row>
                                  </Col>
                                ) : undefined
                              )}
                            </div>
                          </div>
                        )
                      )
                    })}
                  </div>
                </div>
              ))}

              {/* additional amount */}
              {amountFeeInfos && (
                <div className="flex-grow px-6 border-1.5 border-[rgba(171,196,255,.5)] rounded-xl">
                  {amountFeeInfos.map((info) => (
                    <Col key={toPubString(info.amount.token.mint)} className="py-4 gap-1 items-center">
                      <div className="text-lg mobile:text-base font-semibold">{info.amount.token.symbol}</div>
                      <Row className="items-center  gap-2">
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
              )}
            </Col>
          )}
        </AsyncAwait>
      </div>
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
function FormularOperator({ operator }: { operator: '+' | '-' | '=' }) {
  return <div className="text-[#abc4ff80] text-xl font-medium">{operator}</div>
}

function CoinAvatarInfoItem({
  ammPool,
  position
}: {
  ammPool: HydratedConcentratedInfo
  position?: UserPositionAccount
}) {
  const isMobile = useAppSettings((s) => s.isMobile)

  const maxAcceptPriceDecimal = 15

  const maxSignificantCount = (decimals: number) => Math.min(decimals + 2, maxAcceptPriceDecimal)

  return (
    <Row className="gap-4">
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
              <div>{ammPool.name}</div>
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
            <div className="font-medium text-xs text-[#ABC4FF]/50">Fee {toPercentString(ammPool.tradeFeeRate)}</div>
          </Col>
        </Row>
      </AutoBox>

      {position && (
        <Grid className="items-center text-white mobile:text-sm">
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
      )}
    </Row>
  )
}
