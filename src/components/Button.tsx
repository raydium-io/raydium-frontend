import React, { ReactNode, RefObject, useImperativeHandle, useRef } from 'react'

import { twMerge } from 'tailwind-merge'

import { isArray } from '@/functions/judgers/dateType'
import { shrinkToValue } from '@/functions/shrinkToValue'
import { BooleanLike, MayFunction } from '@/types/constants'
import { MayArray } from '@/types/generics'
import Row from './Row'
import LoadingCircle from './LoadingCircle'
import LoadingCircleSmall from './LoadingCircleSmall'

export interface ButtonHandle {
  click?: () => void
  focus?: () => void
}
export interface ButtonProps {
  size?: 'xs' | 'md' | 'sm' | 'lg'
  noComponentCss?: boolean
  // used in "connect wallet" button, it's order is over props: disabled
  forceActive?: boolean
  /** a short cut for validator */
  disabled?: boolean
  /** default is solid */
  type?: 'solid' | 'outline' | 'text'
  /** unused tailwind style class string will be tree-shaked  */
  className?: string
  isLoading?: boolean
  /** must all condition passed */
  validators?: MayArray<{
    /** must return true to pass this validator */
    should: MayFunction<BooleanLike>
    // used in "connect wallet" button, it's order is over props: disabled
    forceActive?: boolean
    /**  items are button's setting which will apply when corresponding validator has failed */
    fallbackProps?: Omit<ButtonProps, 'validators' | 'disabled'>
  }>
  children?: ReactNode
  /** normally, it's an icon  */
  prefix?: ReactNode
  /** normally, it's an icon  */
  suffix?: ReactNode
  onClick?: (info: { ev: React.MouseEvent<HTMLButtonElement, MouseEvent> }) => void
  componentRef?: RefObject<any>
}

/** has loaded **twMerge** */
export default function Button({ validators, ...restProps }: ButtonProps) {
  const failedValidator = (isArray(validators) ? validators.length > 0 : validators)
    ? [validators!].flat().find(({ should }) => !shrinkToValue(should))
    : undefined
  const mergedProps = {
    ...restProps,
    ...failedValidator?.fallbackProps
  }
  const {
    type = 'solid',
    className = '',
    noComponentCss,
    size,
    children,
    onClick,
    componentRef,
    suffix,
    prefix,
    isLoading
  } = mergedProps

  const haveFallbackClick = Boolean(failedValidator?.fallbackProps?.onClick)
  const isActive = !isLoading && (failedValidator?.forceActive || (!failedValidator && !mergedProps.disabled))

  const ref = useRef<HTMLButtonElement>(null)
  useImperativeHandle(componentRef, () => ({
    click: () => {
      ref.current?.click()
    },
    focus: () => {
      ref.current?.focus()
    }
  }))
  return (
    <button
      ref={ref}
      onClick={(ev) => {
        if (!isActive) ev.stopPropagation()
        if (isActive || haveFallbackClick) onClick?.({ ev })
      }}
      className={
        noComponentCss
          ? className
          : twMerge(
              'Button select-none inline-flex justify-center items-center gap-2',
              type === 'text'
                ? textButtonTailwind({ size, disable: !isActive, haveFallbackClick })
                : type === 'outline'
                ? outlineButtonTailwind({ size, disable: !isActive, haveFallbackClick })
                : solidButtonTailwind({ size, disable: !isActive, haveFallbackClick }),
              className
            )
      }
    >
      {isLoading && <LoadingCircleSmall className="w-4 h-4" />}
      {prefix}
      {children}
      {suffix}
    </button>
  )
}

/** base inner <Button> style  */
function solidButtonTailwind({
  size = 'default',
  disable,
  haveFallbackClick
}: { size?: 'xs' | 'md' | 'sm' | 'lg' | 'default'; disable?: boolean; haveFallbackClick?: boolean } = {}) {
  return `${
    size === 'lg'
      ? 'px-6 py-3.5 rounded-xl font-bold'
      : size === 'sm'
      ? 'px-4 py-2 text-sm rounded-xl font-medium'
      : size === 'xs'
      ? 'px-4 py-2 text-xs rounded-xl font-medium'
      : 'px-4 py-2.5  rounded-xl font-medium'
  } whitespace-nowrap appearance-none ${
    disable
      ? `bg-formkit-thumb-disable text-formkit-thumb-text-disabled opacity-40 ${
          haveFallbackClick ? '' : 'cursor-not-allowed'
        }`
      : 'bg-formkit-thumb text-formkit-thumb-text-normal clickable clickable-filter-effect'
  }`
}

/** extra inner <Button> style */
function outlineButtonTailwind({
  size = 'default',
  disable,
  haveFallbackClick
}: { size?: 'xs' | 'md' | 'sm' | 'lg' | 'default'; disable?: boolean; haveFallbackClick?: boolean } = {}) {
  return `${
    size === 'lg'
      ? 'py-4 px-4 rounded-xl'
      : size === 'sm'
      ? 'px-2.5 py-1.5 text-sm rounded-xl'
      : size === 'xs'
      ? 'px-4 py-2 text-xs rounded-xl'
      : 'px-4 py-2.5  rounded-xl'
  } whitespace-nowrap appearance-none ring-1.5 ring-inset ring-current ${
    disable ? `opacity-40 ${haveFallbackClick ? '' : 'cursor-not-allowed'}` : 'clickable clickable-filter-effect'
  }`
}

/** extra inner <Button> style */
function textButtonTailwind({
  size = 'default',
  disable,
  haveFallbackClick
}: { size?: 'xs' | 'md' | 'sm' | 'lg' | 'default'; disable?: boolean; haveFallbackClick?: boolean } = {}) {
  return `${
    size === 'lg'
      ? 'py-4 px-4 rounded-xl'
      : size === 'sm'
      ? 'px-2.5 py-1.5 text-sm rounded-xl'
      : size === 'xs'
      ? 'px-4 py-2 text-xs rounded-xl'
      : 'px-4 py-2.5  rounded-xl'
  } whitespace-nowrap appearance-none text-white ${
    disable ? `opacity-40 ${haveFallbackClick ? '' : 'cursor-not-allowed'}` : 'clickable clickable-filter-effect'
  }`
}
