import { CSSProperties, ReactNode, RefObject, useEffect, useImperativeHandle, useMemo, useRef } from 'react'

import { twMerge } from 'tailwind-merge'

import useAppSettings from '@/application/common/useAppSettings'
import { usePools } from '@/application/pools/usePools'
import {
  isQuantumSOL,
  isQuantumSOLVersionSOL,
  isQuantumSOLVersionWSOL,
  SOL_BASE_BALANCE,
  WSOLMint
} from '@/application/token/quantumSOL'
import { Token, TokenAmount } from '@/application/token/type'
import useToken from '@/application/token/useToken'
import useWallet from '@/application/wallet/useWallet'
import toPubString from '@/functions/format/toMintString'
import { toTokenAmount } from '@/functions/format/toTokenAmount'
import toTotalPrice from '@/functions/format/toTotalPrice'
import toUsdVolume from '@/functions/format/toUsdVolume'
import { isMintEqual } from '@/functions/judgers/areEqual'
import { isTokenAmount } from '@/functions/judgers/dateType'
import { gt, gte, lt } from '@/functions/numberish/compare'
import { mul, sub } from '@/functions/numberish/operations'
import { toString } from '@/functions/numberish/toString'
import { useSignalState } from '@/hooks/useSignalState'
import { Numberish } from '@/types/constants'

import { getTransferFeeInfo } from '@/application/token/getTransferFeeInfos'
import { isToken2022 } from '@/application/token/isToken2022'
import useAsyncMemo from '@/hooks/useAsyncMemo'
import Button from './Button'
import CoinAvatar from './CoinAvatar'
import Col from './Col'
import DecimalInput from './DecimalInput'
import Icon from './Icon'
import Row from './Row'
import Tooltip from './Tooltip'
import { Token2022Badge } from './Badge'

export interface CoinInputBoxHandle {
  focusInput?: () => void
  selectToken?: () => void
}

export interface CoinInputBoxProps {
  // basic
  className?: string
  domRef?: RefObject<any>
  componentRef?: RefObject<any>
  style?: CSSProperties
  // data
  value?: string
  token?: Token

  // validator
  disabled?: boolean
  renderDisabledMask?: ReactNode
  noDisableStyle?: boolean
  disableTokenSelect?: boolean // if not prop:disabledTokenSelect but prop:disabled, result is disabled
  disabledInput?: boolean // if not prop:disabledInput but prop:disabled, result is disabled

  // -------- callbacks ----------
  //! include press max button
  onUserInput?(input: string): void
  onEnter?(input: string | undefined): void

  onTryToTokenSelect?(): void
  onTryToSwitchSOLWSOL?(): void
  // return valid info
  onInputAmountClampInBalanceChange?(info: {
    outOfMax: boolean
    negative: boolean
    inputedAmount: string
    maxValue: Numberish
  }): void
  onBlur?(input: string | undefined): void
  onPriceChange?(Fraction): void
  onCustomMax?(): void

  // -------- customized ----------
  // customize component appearance
  topLeftLabel?: ReactNode
  HTMLTitleTooltip?: string
  /** By default, it will be Balance: xxx,  */
  topRightLabel?: ReactNode
  // sometimes, should show staked deposited lp, instead of wallet balance
  maxValue?: Numberish

  /** show: 0.0 */
  hasPlaceholder?: boolean
  /**
   * in some business
   * for example, farm created in SOL, but should can edited in WSOL
   * corresponding `listener: onTryToSwitchSOLWSOL`
   */
  allowSOLWSOLSwitch?: boolean
  // used in acceleraytor (input tickets)
  hideTokenPart?: boolean
  // sometimes, U don't need price predictor, for it's not a token (may be it's lottery ticket or some pure amount input)
  hidePricePredictor?: boolean
  haveHalfButton?: boolean
  hideMaxButton?: boolean
  haveCoinIcon?: boolean
  // by default, SOL balance will sub 0.05
  canFillFullBalance?: boolean
  showTokenSelectIcon?: boolean

  /** only token is selected;  only part of token 2022 have transfer Fee */
  /** sometimes there is no need for check fee, for example: in swap */
  hideTransferFee?: boolean
  /** only token is selected;  only part of token 2022 have transfer Fee */
  transferFeeOption?: {
    /** SDK have this options, In most case, it's true */
    addMode?: boolean
  }
  /** only token is selected; only part of token 2022 have transfer Fee */
  onCalculateTransferFee?(feeAmount: TokenAmount | undefined): void
}

// TODO: split into different customized component (to handle different use cases)
/**
 * support to input both token and lpToken
 */
export default function CoinInputBox({
  className,
  domRef,
  componentRef,
  style,

  disabled,
  renderDisabledMask,
  noDisableStyle,
  disabledInput: innerDisabledInput,
  disableTokenSelect: innerDisabledTokenSelect,

  value,
  token,
  onUserInput,
  onTryToTokenSelect,
  onTryToSwitchSOLWSOL,
  onInputAmountClampInBalanceChange,
  onEnter,
  onBlur,
  onPriceChange,
  onCustomMax,

  topLeftLabel,
  HTMLTitleTooltip,
  topRightLabel,
  maxValue: forceMaxValue,

  hasPlaceholder,
  allowSOLWSOLSwitch,
  hideTokenPart,
  hidePricePredictor,
  hideMaxButton,
  haveHalfButton,
  haveCoinIcon,
  canFillFullBalance,
  showTokenSelectIcon,

  hideTransferFee,
  transferFeeOption,
  onCalculateTransferFee
}: CoinInputBoxProps) {
  const disabledInput = disabled || innerDisabledInput
  const disabledTokenSelect = disabled || innerDisabledTokenSelect
  // if user is inputing or just input, no need to update upon out-side value
  const isOutsideValueLocked = useRef(false)
  const { connected, getBalance, tokenAccounts } = useWallet()
  const { lpPrices } = usePools()
  const isMobile = useAppSettings((s) => s.isMobile)
  const tokenPrices = useToken((s) => s.tokenPrices)

  const variousPrices = { ...lpPrices, ...tokenPrices }
  const [inputedAmount, setInputedAmount, inputAmountSignal] = useSignalState<string>() // setInputedAmount use to state , not sync, useSignalState can get sync value
  // sync outter's value and inner's inputedAmount
  useEffect(() => {
    if (isOutsideValueLocked.current) return
    setInputedAmount(value)
  }, [value])

  useEffect(() => {
    if (!isOutsideValueLocked.current) return
    if (inputedAmount !== value) {
      onUserInput?.(inputedAmount ?? '')
    }
  }, [inputedAmount])

  // input over max value in invalid
  const maxValue =
    forceMaxValue ??
    getBalance(token) ??
    (token
      ? (() => {
          const targetTokenAccount = tokenAccounts.find((t) => toPubString(t.mint) === toPubString(token?.mint))
          return targetTokenAccount && toTokenAmount(token, targetTokenAccount?.amount)
        })()
      : undefined)

  useEffect(() => {
    if (inputedAmount && maxValue) {
      onInputAmountClampInBalanceChange?.({
        negative: lt(inputedAmount, '0'),
        outOfMax: gt(inputedAmount, maxValue),
        inputedAmount,
        maxValue
      })
    }
  }, [inputedAmount, maxValue])

  const inputRef = useRef<HTMLInputElement>(null)
  const focusInput = () => inputRef.current?.focus()

  const price = variousPrices[String(token?.mint)] ?? null

  const totalPrice = useMemo(() => {
    if (!price || !inputedAmount) return undefined
    return toTotalPrice(inputedAmount, price)
  }, [inputedAmount, price])

  useEffect(() => {
    onPriceChange?.(totalPrice)
  }, [onPriceChange, totalPrice])

  // input must satisfied validPattern
  const validPattern = useMemo(() => new RegExp(`^(\\d*)(\\.\\d{0,${token?.decimals ?? 6}})?$`), [token])

  // if switch selected token, may doesn't satisfied pattern. just extract satisfied part.
  useEffect(() => {
    const satisfied = validPattern.test(inputAmountSignal() ?? '') // use signal to get sync value
    if (!satisfied) {
      const matched = inputAmountSignal()?.match(`^(\\d*)(\\.\\d{0,${token?.decimals ?? 6}})?(\\d*)$`)
      const [, validInt = '', validDecimal = ''] = matched ?? []
      const sliced = validInt + validDecimal
      setInputedAmount(sliced)
    }
  }, [token, validPattern])

  // press button will also cause user input.
  function fillAmountWithBalance(percent: number) {
    let maxBalance = maxValue
    if (
      !canFillFullBalance &&
      isTokenAmount(maxValue) &&
      isQuantumSOL(maxValue.token) &&
      !isQuantumSOLVersionWSOL(maxValue.token)
    ) {
      // if user select sol max balance is -0.05
      maxBalance = toTokenAmount(
        maxValue.token,
        gte(maxValue, SOL_BASE_BALANCE) ? sub(maxValue, SOL_BASE_BALANCE) : 0,
        { alreadyDecimaled: true }
      )
    }
    const newAmount = toString(mul(maxBalance, percent), {
      decimalLength: isTokenAmount(maxValue) ? `auto ${maxValue.token.decimals}` : undefined
    })
    onUserInput?.(newAmount) // set both outside and inside
    setInputedAmount(newAmount) // set both outside and inside
    isOutsideValueLocked.current = false
  }

  useImperativeHandle(
    componentRef,
    () =>
      ({
        focusInput: () => {
          focusInput()
        },
        selectToken: () => {
          onTryToTokenSelect?.()
        }
      } as CoinInputBoxHandle)
  )

  const canSwitchSOLWSOL = disabledTokenSelect && allowSOLWSOLSwitch && isMintEqual(token?.mint, WSOLMint)

  const needCheckFee = !hideTransferFee && token && isToken2022(token)
  const transferFeeInfo = useAsyncMemo(
    () =>
      needCheckFee
        ? getTransferFeeInfo({
            amount: toTokenAmount(token, inputedAmount ?? '0', { alreadyDecimaled: true }),
            addFee: transferFeeOption?.addMode
          })
        : undefined,
    [token, inputedAmount, needCheckFee]
  )

  useEffect(() => {
    if (needCheckFee) onCalculateTransferFee?.(transferFeeInfo?.fee)
  }, [transferFeeInfo?.fee])

  return (
    <Row
      className={twMerge(
        `relative flex-col bg-[#141041] cursor-text rounded-xl py-3 px-6 mobile:px-4 ${
          disabled && !noDisableStyle ? 'pointer-events-none-entirely cursor-default opacity-50' : ''
        }`,
        className
      )}
      style={style}
      domRef={domRef}
      htmlPorps={{
        tabIndex: 0
      }}
      onClick={focusInput}
    >
      {/* disable mask */}
      {renderDisabledMask && disabled && <div className="absolute inset-0">{renderDisabledMask}</div>}

      {/* from & balance */}
      <Row className="justify-between mb-2">
        <div className="text-xs mobile:text-2xs text-[rgba(171,196,255,.5)]" title={HTMLTitleTooltip}>
          {topLeftLabel}
        </div>
        <div
          className={`text-xs mobile:text-2xs justify-self-end text-[rgba(171,196,255,.5)] ${
            disabledInput ? '' : 'clickable no-clicable-transform-effect clickable-filter-effect'
          }`}
          onClick={() => {
            if (disabledInput) return
            if (onCustomMax) {
              onCustomMax()
              setInputedAmount(typeof maxValue === 'string' ? maxValue : toString(maxValue))
            } else {
              fillAmountWithBalance(1)
            }
          }}
        >
          {topRightLabel ?? `Balance: ${toString(maxValue) || (connected ? '--' : '(Wallet not connected)')}`}
        </div>
      </Row>

      {/* input-container */}
      <Row className="col-span-full items-center">
        {!hideTokenPart && (
          <>
            <Row
              className={`items-center gap-1.5 ${
                (showTokenSelectIcon && !disabledTokenSelect) || canSwitchSOLWSOL
                  ? 'clickable clickable-mask-offset-2'
                  : ''
              }`}
              onClick={(ev) => {
                ev.stopPropagation()
                ev.preventDefault()
                if (canSwitchSOLWSOL) onTryToSwitchSOLWSOL?.()
                if (disabledTokenSelect) return
                onTryToTokenSelect?.()
              }}
              htmlPorps={{
                title: canSwitchSOLWSOL
                  ? isQuantumSOLVersionSOL(token)
                    ? 'switch to WSOL'
                    : 'switch to SOL'
                  : undefined
              }}
            >
              {haveCoinIcon && token && <CoinAvatar token={token} size={isMobile ? 'smi' : 'md'} />}
              <Col className="items-start">
                <div
                  className={`text-[rgb(171,196,255)] max-w-[7em] ${
                    token ? 'min-w-[2em]' : ''
                  } overflow-hidden text-ellipsis font-medium text-base flex-grow mobile:text-sm whitespace-nowrap`}
                >
                  {token?.symbol ?? '--'}
                </div>
                {isToken2022(token) && <Token2022Badge pale />}
              </Col>
              {showTokenSelectIcon && !disabledTokenSelect && (
                <Icon size="xs" heroIconName="chevron-down" className="text-[#ABC4FF]" />
              )}
            </Row>
            {/* divider */}
            <div className="my-1 mx-4 mobile:my-0 mobile:mx-2 border-r border-[rgba(171,196,255,0.5)] self-stretch" />
          </>
        )}
        <Row className="justify-between flex-grow-2">
          <Row className="gap-px items-center mr-2">
            {!hideMaxButton && (
              <Button
                disabled={disabledInput}
                className="py-0.5 px-1.5 rounded text-[rgba(171,196,255,.5)] font-bold bg-[#1B1659] bg-opacity-80 text-xs mobile:text-2xs transition"
                onClick={() => {
                  if (onCustomMax) {
                    onCustomMax()
                    setInputedAmount(typeof maxValue === 'string' ? maxValue : toString(maxValue))
                  } else {
                    fillAmountWithBalance(1)
                  }
                }}
              >
                Max
              </Button>
            )}
            {haveHalfButton && (
              <Button
                disabled={disabledInput}
                className="py-0.5 px-1.5 rounded text-[rgba(171,196,255,.5)] font-bold bg-[#1B1659] bg-opacity-80 text-xs mobile:text-2xs transition"
                onClick={() => {
                  fillAmountWithBalance(0.5)
                }}
              >
                Half
              </Button>
            )}
          </Row>
          <DecimalInput
            className="font-medium text-lg text-white flex-grow w-full"
            disabled={disabledInput}
            decimalCount={token?.decimals}
            componentRef={inputRef}
            placeholder={hasPlaceholder ? '0.0' : undefined}
            value={inputedAmount}
            onUserInput={(t) => {
              setInputedAmount(String(t || ''))
            }}
            onEnter={onEnter}
            inputClassName="text-right mobile:text-sm font-medium text-white"
            onBlur={(input) => {
              isOutsideValueLocked.current = false
              onBlur?.(input || undefined)
            }}
            onFocus={() => {
              isOutsideValueLocked.current = true
            }}
          />
        </Row>
      </Row>

      <Row className="items-center gap-2 justify-end text-xs mobile:text-2xs text-[rgba(171,196,255,.5)] ">
        {/* token 2022 fee */}
        {transferFeeInfo && (
          <Row className="items-center gap-0.5">
            <div>Transfer fee</div>
            <Tooltip>
              <Icon size="xs" heroIconName="information-circle" />
              <Tooltip.Panel>
                <div className="max-w-[300px] space-y-1.5">
                  This token uses the Token 2022 program and includes transfer fee. These the final deposit amounts for
                  the position and the transfer fee
                </div>
              </Tooltip.Panel>
            </Tooltip>
            <div>:</div>
            <div>{toString(transferFeeInfo.fee)}</div>
          </Row>
        )}

        {/* divider */}
        {transferFeeInfo && !hidePricePredictor && <div>|</div>}

        {/* price-predictor */}
        {!hidePricePredictor && (
          <div
            className={`${
              !inputedAmount || inputedAmount === '0' ? 'invisible' : ''
            } text-ellipsis overflow-hidden text-right`}
          >
            {totalPrice ? toUsdVolume(totalPrice) : '--'}
          </div>
        )}
      </Row>
    </Row>
  )
}
