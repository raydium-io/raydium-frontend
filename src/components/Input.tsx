import React, {
  CSSProperties,
  InputHTMLAttributes,
  ReactNode,
  RefObject,
  useEffect,
  useImperativeHandle,
  useRef,
  useState
} from 'react'

import { twMerge } from 'tailwind-merge'

import mergeRef from '@/functions/react/mergeRef'
import useToggle from '@/hooks/useToggle'

import Row from './Row'
import { MayArray, MayFunction, BooleanLike } from '@/types/constants'
import { shrinkToValue } from '@/functions/shrinkToValue'
import mergeProps from '@/functions/react/mergeProps'

export interface InputHandler {
  focus(): void
  clearInput(): void
}

export interface InputProps {
  id?: string // for accessibility

  type?: string // current support type in this app

  /** this will cause auto-grow <input> */
  required?: boolean // for readability
  /**aria */
  labelText?: string // for readability used for aria

  pattern?: RegExp // with force pattern, you only can input pattern allowed string

  /** only first render */
  defaultValue?: string

  /** when change, affact to ui*/
  value?: string

  placeholder?: string

  disabled?: boolean

  /** must all condition passed (one by one) */
  validators?: MayArray<{
    /** expression must return true to pass this validator */
    should: MayFunction<boolean, [text: string, payload: { el: HTMLInputElement; control: InputHandler }]>
    /**  items are button's setting which will apply when corresponding validator has failed */
    validProps?: Omit<InputProps, 'validators' | 'disabled'>
    invalidProps?: Omit<InputProps, 'validators' | 'disabled'>
    onValid?: (text: string, payload: { el: HTMLInputElement; control: InputHandler }) => void
    onInvalid?: (text: string, payload: { el: HTMLInputElement; control: InputHandler }) => void
  }>

  /** Optional. usually, it is an <Input>'s icon */
  prefix?: ReactNode

  /** Optional. usually, it is an <Input>'s unit or feature icon */
  suffix?: ReactNode

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
  onUserInput?: (text: string, el: HTMLInputElement) => void
  onClick?: (text: string, payload: { el: HTMLInputElement; control: InputHandler }) => void
  onEnter?: (text: string, payload: { el: HTMLInputElement; control: InputHandler }) => void
  onBlur?: (text: string, payload: { el: HTMLInputElement; control: InputHandler }) => void
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

    required,
    labelText,

    pattern,

    placeholder,

    disabled,
    validators,

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
    onClick
  } = mergeProps(props, fallbackProps)

  const inputRef = useRef<HTMLInputElement>()

  // only useable for uncontrolled formkit
  const [selfValue, setSelfValue] = useState(defaultValue ?? value ?? '')
  useEffect(() => {
    setSelfValue(value ?? '')
  }, [value])

  useEffect(() => {
    if (!inputRef.current) return
    onDangerousValueChange?.(String(value ?? ''), inputRef.current)
  }, [value])

  // if user is inputing or just input, no need to update upon out-side value
  const [isOutsideValueLocked, { on: lockOutsideValue, off: unlockOutsideValue }] = useToggle()

  const inputControls: InputHandler = {
    focus() {
      inputRef?.current?.focus()
    },
    clearInput() {
      setSelfValue('')
    }
  }

  useImperativeHandle(componentRef, () => inputControls)

  return (
    <Row
      className={twMerge(`Input ${disabled ? 'cursor-not-allowed' : 'cursor-text'} items-center`, className)}
      onClick={() => {
        if (disabled || !inputRef.current) return
        inputRef.current.focus()
        onClick?.(selfValue, { el: inputRef.current, control: inputControls })
      }}
      style={style}
      domRef={domRef}
    >
      <div className="flex-initial">{prefix}</div>

      {/* input-wrapperbox is for style input inner body easier */}
      <div className={twMerge('flex-grow flex-shrink', inputWrapperClassName)}>
        <input
          autoComplete="off"
          id={id}
          type={type}
          ref={mergeRef(inputRef, inputDomRef)}
          className={`bg-transparent border-none w-full outline-none block ${inputClassName ?? ''}`} // start html input with only 2rem, if need width please define it in parent div
          value={isOutsideValueLocked ? selfValue ?? value : value ?? selfValue}
          placeholder={placeholder ? String(placeholder) : undefined}
          disabled={disabled}
          onChange={(ev) => {
            const inputText = ev.target.value

            // refuse unallowed input
            if (pattern && !pattern.test(inputText)) return

            // update validator infos
            if (validators) {
              // all validators must be true
              for (const validator of [validators].flat()) {
                const passed = Boolean(
                  shrinkToValue(validator.should, [inputText, { el: inputRef.current!, control: inputControls }])
                )
                if (passed) {
                  setFallbackProps(validator.validProps ?? {})
                  validator.onValid?.(inputText, { el: inputRef.current!, control: inputControls })
                }
                if (!passed) {
                  setFallbackProps(validator.invalidProps ?? {})
                  validator.onInvalid?.(inputText, { el: inputRef.current!, control: inputControls })
                }
              }
            }

            setSelfValue(inputText)
            onUserInput?.(ev.target.value, inputRef.current!)
            lockOutsideValue()
          }}
          onBlur={() => {
            unlockOutsideValue()
            onBlur?.(selfValue, { el: inputRef.current!, control: inputControls })
          }}
          onKeyDown={(ev) => {
            if (ev.key === 'Enter') {
              onEnter?.((ev.target as HTMLInputElement).value, { el: inputRef.current!, control: inputControls })
            }
          }}
          aria-label={labelText}
          aria-required={required}
          {...inputHTMLProps}
        />
      </div>
      {suffix && <div className="flex-initial ml-2">{suffix}</div>}
    </Row>
  )
}
