import React, {
  CSSProperties, InputHTMLAttributes, ReactNode, RefObject, startTransition, useEffect, useImperativeHandle, useRef,
  useState
} from 'react'

import assert from 'assert'
import { twMerge } from 'tailwind-merge'

import { getSessionItem, setSessionItem } from '@/functions/dom/jStorage'
import { isRegExp } from '@/functions/judgers/dateType'
import { gt } from '@/functions/numberish/compare'
import toFraction from '@/functions/numberish/toFraction'
import mergeProps from '@/functions/react/mergeProps'
import mergeRef from '@/functions/react/mergeRef'
import { shrinkToValue } from '@/functions/shrinkToValue'
import useInit from '@/hooks/useInit'
import useToggle from '@/hooks/useToggle'
import useUpdate from '@/hooks/useUpdate'
import { MayArray, MayFunction } from '@/types/constants'

import Row from './Row'

export interface InputComponentHandler {
  text: string | number | undefined
  focus(): void
  blur(): void
  setInputText(value: string | number | undefined, options?: { isUserInput?: boolean }): void
  clearInputValue(): void
}

export interface InputProps {
  /** will record input result in localStorage */
  id?: string

  type?: string // current support type in this app

  noCSSInputDefaultWidth?: boolean // <input> have default width, sometimes, it's weird

  /** this will cause auto-grow <input> */
  required?: boolean // for readability
  /**aria */
  labelText?: string // for readability used for aria

  // with force pattern, you only can input pattern allowed string
  pattern?: MayArray<RegExp | ((v: string | undefined) => boolean)> /* if return false, user's input will be ignore */

  // maximum value
  maximum?: number

  /** only first render */
  defaultValue?: string | number

  /** when change, affact to ui*/
  value?: string | number

  // /**
  //  * when unset this property, value can only effect inner when input is not no focus
  //  */
  // outsideValueCanEffectWhen?: 'if-not-focus' /* default */ | 'any-time'

  placeholder?: string | number

  disabled?: boolean
  /** half disable (progammly input still can input,and looks like still can input, but user's input will be ignore) */
  disableUserInput?: boolean
  /** must all condition passed (one by one) */
  validators?: MayArray<{
    /** expression must return true to pass this validator */
    should: MayFunction<boolean, [text: string, payload: { el: HTMLInputElement; control: InputComponentHandler }]>
    /**  items are button's setting which will apply when corresponding validator has failed */
    validProps?: Omit<InputProps, 'validators' | 'disabled'>
    invalidProps?: Omit<InputProps, 'validators' | 'disabled'>
    onValid?: (text: string, payload: { el: HTMLInputElement; control: InputComponentHandler }) => void
    onInvalid?: (text: string, payload: { el: HTMLInputElement; control: InputComponentHandler }) => void
  }>

  /** Optional. usually, it is an <Input>'s icon */
  prefix?: MayFunction<ReactNode, [InputComponentHandler]>

  /** Optional. usually, it is an <Input>'s unit or feature icon */
  suffix?: MayFunction<ReactNode, [InputComponentHandler]>

  domRef?: RefObject<any>
  className?: string
  componentRef?: RefObject<any>
  inputDomRef?: RefObject<any>

  inputWrapperClassName?: string
  inputClassName?: string
  inputHTMLProps?: InputHTMLAttributes<any>
  style?: CSSProperties
  /**
   * this callback may be invoked every time value change regardless it is change by user input or js code
   * as a controlled formkit, U should avoid using it if U can
   * it may be confusing with onUserInput sometimes
   */
  onDangerousValueChange?: (currentValue: string, el: HTMLInputElement) => void
  onUserInput?: (text: string /* TODO: should also undefined */, el: HTMLInputElement) => void
  onClick?: (
    text: string,
    payload: {
      el: HTMLInputElement
      control: InputComponentHandler
      setSelfWithoutUserInput: (v: string | undefined) => void
      setSelf: (v: string | undefined) => void
    }
  ) => void
  onEnter?: (
    text: string,
    payload: {
      el: HTMLInputElement
      control: InputComponentHandler
      setSelfWithoutUserInput: (v: string | undefined) => void
      setSelf: (v: string | undefined) => void
    }
  ) => void
  onBlur?: (
    text: string,
    payload: {
      el: HTMLInputElement
      control: InputComponentHandler
      setSelfWithoutUserInput: (v: string | undefined) => void
      setSelf: (v: string | undefined) => void
    }
  ) => void
  onFocus?: (
    text: string,
    payload: {
      el: HTMLInputElement
      control: InputComponentHandler
      setSelfWithoutUserInput: (v: string | undefined) => void
      setSelf: (v: string | undefined) => void
    }
  ) => void
}

/**
 *  both controlled and uncontrolled
 *
 *  default **uncontrolled** Kit
 *  - when set `defaultValue` --- **uncontrolled** Kit
 *  - when set `value` --- **controlled** Kit
 */
// TODO: use `contenteditable` to simulate inner `<input>` to make it flexible
export default function Input(props: InputProps) {
  // props set by validators
  const [fallbackProps, setFallbackProps] = useState<Omit<InputProps, 'validators' | 'disabled'>>()

  const {
    id,

    type,

    noCSSInputDefaultWidth,

    required,
    labelText,

    placeholder,

    disabled,
    disableUserInput,
    validators,
    pattern,
    maximum,

    defaultValue,
    value,

    prefix,
    suffix,
    domRef,
    style,
    className,
    componentRef,
    inputDomRef,
    inputWrapperClassName,
    inputClassName,
    inputHTMLProps,
    onDangerousValueChange,
    onUserInput,
    onEnter,
    onBlur,
    onFocus,
    onClick
  } = mergeProps(props, fallbackProps)

  const inputRef = useRef<HTMLInputElement>()

  // only useable for uncontrolled formkit
  const [selfValue, setSelfValue] = useState(defaultValue ?? value ?? '')

  // if (set id),  sync sessionStorage to cache user input
  if (id) {
    useUpdate(() => {
      setSessionItem(id, selfValue)
    }, [selfValue])
    useInit(() => {
      const sessionStoredValue = getSessionItem(id)
      if (sessionStoredValue) {
        setSelfValue(String(sessionStoredValue))
        onUserInput?.(String(sessionStoredValue), inputRef.current!)
      }
    })
  }

  useEffect(() => {
    if (!inputRef.current) return
    onDangerousValueChange?.(String(value ?? ''), inputRef.current)
  }, [value])

  // if user is inputing or just input, no need to update upon out-side value
  const [isOutsideValueLocked, { on: lockOutsideValue, off: unlockOutsideValue }] = useToggle()
  useEffect(() => {
    if (!isOutsideValueLocked) setSelfValue(value ?? '')
  }, [value])

  const inputComponentHandler: InputComponentHandler = {
    text: selfValue,
    focus() {
      inputRef?.current?.focus()
    },
    blur() {
      inputRef?.current?.blur()
    },
    setInputText(value, options) {
      const text = String(value ?? '')
      setSelfValue(text)
      if (options?.isUserInput) onUserInput?.(text, inputRef.current!)
    },
    clearInputValue() {
      setSelfValue('')
    }
  }

  useImperativeHandle(componentRef, () => inputComponentHandler)

  // don't bind value through React for it will be a controlled element
  useEffect(() => {
    assert(inputRef.current, '[Dev bug] input ref is not ready!')
    const inputDomValue = inputRef.current.value
    if (String(selfValue) !== inputDomValue) {
      inputRef.current.value = String(selfValue)
    }
  }, [selfValue])

  return (
    <Row
      className={twMerge(`Input ${disabled ? 'cursor-not-allowed' : 'cursor-text'} items-center`, className)}
      onClick={() => {
        if (disabled || !inputRef.current) return
        inputRef.current.focus()
        onClick?.(String(selfValue), {
          el: inputRef.current,
          control: inputComponentHandler,
          setSelfWithoutUserInput: (v) => setSelfValue(v ?? ''),
          setSelf: (v) => {
            setSelfValue(v ?? '')
            onUserInput?.(v ?? '', inputRef.current!)
          }
        })
      }}
      style={style}
      domRef={domRef}
    >
      <div className="flex-initial">{shrinkToValue(prefix, [inputComponentHandler])}</div>

      {/* input-wrapperbox is for style input inner body easier */}
      <div className={twMerge('flex flex-grow flex-shrink', inputWrapperClassName)}>
        <input
          autoComplete="off"
          id={id}
          type={type}
          ref={mergeRef(inputRef, inputDomRef)}
          value={pattern || validators ? selfValue : undefined} // !!! NOTE: if it has pattern validators, input must be controlled component
          className={`${
            noCSSInputDefaultWidth ? 'w-0 grow' : 'w-full'
          } overflow-hidden text-ellipsis bg-transparent border-none outline-none block ${inputClassName ?? ''}`} // start html input with only 2rem, if need width please define it in parent div
          placeholder={placeholder ? String(placeholder) : undefined}
          disabled={disabled || disableUserInput}
          onChange={(ev) => {
            // for onChange is frequest but hight prority action. startTransition so react can abort it
            startTransition(() => {
              const inputText = ev.target.value
              let overwrite = ''

              // half disable (not disable in type)
              if (disableUserInput) return

              // refuse unallowed input
              if (pattern && [pattern].flat().some((p) => (isRegExp(p) ? !p.test(inputText) : !p(inputText)))) return

              if (maximum && gt(toFraction(inputText), maximum)) {
                overwrite = maximum.toString()
              }

              // update validator infos
              if (validators) {
                // all validators must be true
                for (const validator of [validators].flat()) {
                  const passed = Boolean(
                    shrinkToValue(validator.should, [
                      inputText,
                      { el: inputRef.current!, control: inputComponentHandler }
                    ])
                  )
                  if (passed) {
                    setFallbackProps(validator.validProps ?? {})
                    validator.onValid?.(inputText, { el: inputRef.current!, control: inputComponentHandler })
                  }
                  if (!passed) {
                    setFallbackProps(validator.invalidProps ?? {})
                    validator.onInvalid?.(inputText, { el: inputRef.current!, control: inputComponentHandler })
                  }
                }
              }

              setSelfValue(overwrite ? overwrite : inputText)
              onUserInput?.(overwrite ? overwrite : ev.target.value, inputRef.current!)
              lockOutsideValue()
            })
          }}
          aria-label={labelText}
          aria-required={required}
          {...inputHTMLProps}
          onBlur={(ev) => {
            inputHTMLProps?.onBlur?.(ev)
            unlockOutsideValue()
            if (value != null) setSelfValue(value)
            onBlur?.(String(selfValue), {
              el: inputRef.current!,
              control: inputComponentHandler,
              setSelfWithoutUserInput: (v) => setSelfValue(v ?? ''),
              setSelf: (v) => {
                setSelfValue(v ?? '')
                onUserInput?.(v ?? '', inputRef.current!)
              }
            })
          }}
          onFocus={(ev) => {
            inputHTMLProps?.onFocus?.(ev)
            onFocus?.(String(selfValue), {
              el: inputRef.current!,
              control: inputComponentHandler,
              setSelfWithoutUserInput: (v) => setSelfValue(v ?? ''),
              setSelf: (v) => {
                setSelfValue(v ?? '')
                onUserInput?.(v ?? '', inputRef.current!)
              }
            })
          }}
          onKeyDown={(ev) => {
            inputHTMLProps?.onKeyDown?.(ev)
            if (type === 'number' && (ev.key === 'ArrowUp' || ev.key === 'ArrowDown')) {
              ev.preventDefault()
            } else if (ev.key === 'Enter') {
              onEnter?.((ev.target as HTMLInputElement).value, {
                el: inputRef.current!,
                control: inputComponentHandler,
                setSelfWithoutUserInput: (v) => setSelfValue(v ?? ''),
                setSelf: (v) => {
                  setSelfValue(v ?? '')
                  onUserInput?.(v ?? '', inputRef.current!)
                }
              })
            }
          }}
          onWheel={(e) => {
            if (type === 'number') {
              e.currentTarget.blur()
            }
          }}
        />
      </div>
      {suffix && <div className="flex-initial ml-2">{shrinkToValue(suffix, [inputComponentHandler])}</div>}
    </Row>
  )
}

const ControlledInput = (
  props: React.DetailedHTMLProps<React.InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>
) => {
  const { value, onChange, ...rest } = props
  const [cursor, setCursor] = useState(null)
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const input = ref.current
    if (input) input.setSelectionRange(cursor, cursor)
  }, [ref, cursor, value])

  const handleChange = (e) => {
    setCursor(e.target.selectionStart)
    onChange && onChange(e)
  }

  return <input ref={ref} value={value} onChange={handleChange} {...rest} />
}
