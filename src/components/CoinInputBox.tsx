import React, {
  CSSProperties,
  ReactNode,
  RefObject,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState
} from 'react'

import { twMerge } from 'tailwind-merge'

import useAppSettings from '@/application/appSettings/useAppSettings'
import { usePools } from '@/application/pools/usePools'
import { Token } from '@/application/token/type'
import useToken from '@/application/token/useToken'
import { isQuantumSOL, isQuantumSOLVersionWSOL, SOL_BASE_BALANCE } from '@/application/token/quantumSOL'
import useWallet from '@/application/wallet/useWallet'
import { toTokenAmount } from '@/functions/format/toTokenAmount'
import toTotalPrice from '@/functions/format/toTotalPrice'
import toUsdVolume from '@/functions/format/toUsdVolume'
import { isTokenAmount } from '@/functions/judgers/dateType'
import { gt, gte, lt } from '@/functions/numberish/compare'
import { mul, sub } from '@/functions/numberish/operations'

import Button from './Button'
import CoinAvatar from './CoinAvatar'
import Icon from './Icon'
import Input from './Input'
import Row from './Row'
import toPubString from '@/functions/format/toMintString'
import { toString } from '@/functions/numberish/toString'
import { Numberish } from '@/types/constants'

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
  noDisableStyle?: boolean
  disabledTokenSelect?: boolean // if not prop:disabledTokenSelect but prop:disabled, result is disabled
  disabledInput?: boolean // if not prop:disabledInput but prop:disabled, result is disabled

  // -------- callbacks ----------
  //! include press max button
  onUserInput?(input: string): void
  onEnter?(input: string | undefined): void

  onTryToTokenSelect?(): void
  // return valid info
  onInputAmountClampInBalanceChange?(info: { outOfMax: boolean; negative: boolean }): void
  onBlur?(input: string | undefined): void

  // -------- customized ----------
  // customize component appearance
  topLeftLabel?: ReactNode
  /** By default, it will be Balance: xxx,  */
  topRightLabel?: ReactNode
  // sometimes, should show staked deposited lp, instead of wallet balance
  maxValue?: Numberish

  // used in acceleraytor (input tickets)
  hideTokenPart?: boolean
  // sometimes, U don't need price predictor, for it's not a token (may be it's lottery ticket or some pure amount input)
  hidePricePredictor?: boolean
  haveHalfButton?: boolean
  hideMaxButton?: boolean
  haveCoinIcon?: boolean
  showTokenSelectIcon?: boolean
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
  noDisableStyle,
  disabledInput: innerDisabledInput,
  disabledTokenSelect: innerDisabledTokenSelect,

  value,
  token,
  onUserInput,
  onTryToTokenSelect,
  onInputAmountClampInBalanceChange,
  onEnter,
  onBlur,

  topLeftLabel,
  topRightLabel,

  maxValue: forceMaxValue,
  hideTokenPart,
  hidePricePredictor,
  hideMaxButton,
  haveHalfButton,
  haveCoinIcon,
  showTokenSelectIcon
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
  const [inputedAmount, setInputedAmount] = useState<string>()

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
        outOfMax: gt(inputedAmount, maxValue)
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

  // input must satisfied validPattern
  const validPattern = useMemo(() => new RegExp(`^(\\d*)(\\.\\d{0,${token?.decimals ?? 6}})?$`), [token])

  // if switch selected token, may doesn't satisfied pattern. just extract satisfied part.
  useEffect(() => {
    const satisfied = validPattern.test(inputedAmount ?? '')
    if (!satisfied) {
      const matched = inputedAmount?.match(`^(\\d*)(\\.\\d{0,${token?.decimals ?? 6}})?(\\d*)$`)
      const [, validInt = '', validDecimal = ''] = matched ?? []
      const sliced = validInt + validDecimal
      setInputedAmount(sliced)
    }
  }, [token, validPattern])

  // press button will also cause user input.
  function fillAmountWithBalance(percent: number) {
    let maxBalance = maxValue
    if (isTokenAmount(maxValue) && isQuantumSOL(maxValue.token) && !isQuantumSOLVersionWSOL(maxValue.token)) {
      // if user select sol max balance is -0.05
      maxBalance = toTokenAmount(
        maxValue.token,
        gte(maxValue, SOL_BASE_BALANCE) ? sub(maxValue, SOL_BASE_BALANCE) : 0,
        {
          alreadyDecimaled: true
        }
      )
    }
    const newAmount = toString(mul(maxBalance, percent), {
      decimalLength: isTokenAmount(maxValue) ? `auto ${maxValue.token.decimals}` : undefined
    })
    isOutsideValueLocked.current = false
    onUserInput?.(newAmount) // set both outside and inside
    setInputedAmount(newAmount) // set both outside and inside
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

  return (
    <Row
      className={twMerge(
        `flex-col bg-[#141041] cursor-text rounded-xl py-3 px-6 mobile:px-4 ${
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
      {/* from&balance */}
      <Row className="justify-between mb-2 mobile:mb-4">
        <div className="text-xs mobile:text-2xs text-[rgba(171,196,255,.5)]">{topLeftLabel}</div>
        <div
          className={`text-xs mobile:text-2xs justify-self-end text-[rgba(171,196,255,.5)] ${
            disabledInput ? '' : 'clickable no-clicable-transform-effect clickable-filter-effect'
          }`}
          onClick={() => {
            if (disabledInput) return
            fillAmountWithBalance(1)
          }}
        >
          {topRightLabel ?? `Balance: ${toString(maxValue) || (connected ? '--' : '(wallet not connected)')}`}
        </div>
      </Row>

      {/* input-container */}
      <Row className="col-span-full items-center">
        {!hideTokenPart && (
          <>
            <Row
              className={`items-center gap-1.5 ${
                showTokenSelectIcon && !disabledTokenSelect ? 'clickable clickable-mask-offset-2' : ''
              }`}
              onClick={(ev) => {
                ev.stopPropagation()
                ev.preventDefault()
                if (disabledTokenSelect) return
                onTryToTokenSelect?.()
              }}
            >
              {haveCoinIcon && token && <CoinAvatar token={token} size={isMobile ? 'smi' : 'md'} />}
              <div className="text-[rgb(171,196,255)] font-medium text-base flex-grow mobile:text-sm whitespace-nowrap">
                {token?.symbol ?? '--'}
              </div>
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
                  fillAmountWithBalance(1)
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
          <Input
            className="font-medium text-lg text-white flex-grow w-full"
            disabled={disabledInput}
            type="number"
            pattern={validPattern}
            componentRef={inputRef}
            value={inputedAmount}
            onUserInput={setInputedAmount}
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

      {/* price-predictor */}
      {!hidePricePredictor && (
        <div
          className={`text-xs mobile:text-2xs text-[rgba(171,196,255,.5)] ${
            !inputedAmount || inputedAmount === '0' ? 'invisible' : ''
          } text-ellipsis overflow-hidden text-right`}
        >
          {totalPrice ? toUsdVolume(totalPrice) : '--'}
        </div>
      )}
    </Row>
  )
}
