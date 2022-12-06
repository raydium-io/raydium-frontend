import React, {
  ComponentProps, CSSProperties, Fragment, ReactNode, RefObject, useCallback, useEffect, useImperativeHandle, useMemo,
  useRef, useState
} from 'react'
import { createPortal } from 'react-dom'

import { Transition } from '@headlessui/react'
import { BuildingStorefrontIcon } from '@heroicons/react/24/outline'

import { twMerge } from 'tailwind-merge'

import { inClient } from '@/functions/judgers/isSSR'
import addPropsToReactElement from '@/functions/react/addPropsToReactElement'
import { pickReactChild } from '@/functions/react/pickChild'
import { shrinkToValue } from '@/functions/shrinkToValue'
import useCallbackRef from '@/hooks/useCallbackRef'
import { useIsomorphicLayoutEffect } from '@/hooks/useIsomorphicLayoutEffect '
import { MayFunction } from '@/types/constants'

import { PopupLocationInfo, usePopoverLocation } from './useLocationCalculator'
import { PopoverCloseBy, PopoverTiggerBy, PopoverTriggerControls, usePopoverTrigger } from './usePopoverTrigger'

export type PopoverPlacement =
  | 'left'
  | 'left-top'
  | 'left-bottom'
  | 'right'
  | 'right-top'
  | 'right-bottom'
  | 'top'
  | 'top-left'
  | 'top-right'
  | 'bottom'
  | 'bottom-left'
  | 'bottom-right'

export type PopoverHandles = {
  isPanelShowed: boolean
  open(): void
  close(): void
} & PopoverTriggerControls

export interface PopoverProps {
  triggerBy?: PopoverTiggerBy
  /** after delay time, `<Popover>` will be trigger */
  triggerDelay?: number
  closeBy?: PopoverCloseBy
  closeDelay?: number
  className?: string
  children?: ReactNode
  /** usually it's for debug */
  forceOpen?: boolean
  /** only affact init render */
  defaultOpen?: boolean
  canOpen?: boolean
  componentRef?: RefObject<any>
  placement?: PopoverPlacement
  /** for corner placement like 'top-left' 'top-right etc. */
  cornerOffset?: number
  /** gap between `<PopoverButton>` and `<PopoverPanel>`*/
  popoverGap?: number
  /** to leave some space when touch the viewport boundary */
  viewportBoundaryInset?: number
}
export type PopoverPanelProps = {
  $isRenderByMain?: boolean
  domRef?: RefObject<any>
  children?: MayFunction<
    ReactNode,
    [
      payload: {
        locationInfo: PopupLocationInfo
        close(): void
        buttonRef?: RefObject<HTMLDivElement>
        selfRef?: RefObject<HTMLDivElement>
        placement?: PopoverPlacement
      }
    ]
  >
  className?: string
  style?: CSSProperties
}

type PopoverButtonProps = {
  $isRenderByMain?: boolean
  domRef?: RefObject<any>
  children?: ReactNode
  className?: string
}

export const POPOVER_STACK_ID = 'popover-stack'

const popupOrigins = {
  top: 'origin-bottom',
  'top-left': 'origin-bottom-left',
  'top-right': 'origin-bottom-right',
  right: 'origin-left',
  'right-top': 'origin-top-left',
  'right-bottom': 'origin-bottom-left',
  left: 'origin-right',
  'left-top': 'origin-top-right',
  'left-bottom': 'origin-bottom-right',
  bottom: 'origin-top',
  'bottom-left': 'origin-top-left',
  'bottom-right': 'origin-top-right'
}

const PopoverStackPortal = ({ children }) => {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)

    return () => setMounted(false)
  }, [])

  return mounted && inClient && document.querySelector(`#${POPOVER_STACK_ID}`)
    ? createPortal(children, document.querySelector(`#${POPOVER_STACK_ID}`)!)
    : null
}

export default function Popover({
  className,
  children,
  forceOpen,
  placement = 'top',
  triggerBy,
  triggerDelay,
  closeDelay,
  closeBy,
  canOpen = true,
  defaultOpen,
  componentRef,
  cornerOffset,
  popoverGap,
  viewportBoundaryInset
}: PopoverProps) {
  // TODO: no need if buttonRef can be HTMLDivElement not just RefObject<HTMLDivElement>
  const [isPanelRefReady, setIsPanelRefReady] = useState(false)

  const buttonRef = useRef<HTMLDivElement>(null)
  const panelRef = useCallbackRef<HTMLDivElement>({
    onAttach: () => setIsPanelRefReady(true),
    onDetach: () => setIsPanelRefReady(false)
  })

  // TODO: buttonRef can be HTMLDivElement not just RefObject<HTMLDivElement>
  const { isPanelShowed, controls } = usePopoverTrigger(buttonRef, panelRef, {
    disabled: !canOpen,
    defaultOpen,
    triggerDelay,
    closeBy,
    closeDelay,
    triggerBy
  })

  const { locationInfo, updateLocation } = usePopoverLocation(buttonRef, panelRef, {
    placement,
    cornerOffset,
    popoverGap,
    viewportBoundaryInset
  })

  useImperativeHandle(
    componentRef,
    () => ({ ...controls, isPanelShowed, open: controls.on, close: controls.off } as PopoverHandles)
  )

  useIsomorphicLayoutEffect(() => {
    if (isPanelShowed && isPanelRefReady) {
      updateLocation()
    }
  }, [isPanelShowed, isPanelRefReady])

  const popoverButton = pickReactChild(children, PopoverButton, (el) =>
    addPropsToReactElement<ComponentProps<typeof PopoverButton>>(el, {
      $isRenderByMain: true
    })
  )
  const popoverContent = pickReactChild(children, PopoverPanel, (el) =>
    addPropsToReactElement<ComponentProps<typeof PopoverPanel>>(el, (oldProps) => ({
      $isRenderByMain: true,
      $controls: controls,
      $buttonRef: buttonRef,
      domRef: panelRef,
      $placement: placement,
      $isPanelShowed: isPanelShowed,
      children: shrinkToValue(oldProps.children, [
        { close: controls.off, locationInfo: locationInfo, placement, buttonRef, selfRef: panelRef }
      ])
    }))
  )

  const scrollHandler = useCallback(
    (height) => {
      if (
        buttonRef &&
        buttonRef.current &&
        (buttonRef.current.getBoundingClientRect().top < 100 ||
          (height && buttonRef.current.getBoundingClientRect().bottom > height - 100))
      ) {
        controls.off()
      }
    },
    [buttonRef, controls.off]
  )
  useEffect(() => {
    window.addEventListener('scroll', () => scrollHandler(window.innerHeight), true)
    return () => {
      window.removeEventListener('scroll', () => scrollHandler(window.innerHeight), true)
    }
  }, [])

  return (
    <>
      <div ref={buttonRef}>{popoverButton}</div>
      <PopoverStackPortal>
        <div className={twMerge(Popover.name, className)}>
          <Transition
            appear
            show={forceOpen || isPanelShowed}
            as={Fragment}
            enter="transition-all duration-150"
            enterFrom="opacity-0 scale-50"
            enterTo="opacity-100 scale-100"
            leave="transition-all duration-75"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-50"
          >
            <div
              className={`absolute z-popover transform ${popupOrigins[placement]}`}
              style={
                locationInfo ? { left: locationInfo.panelLeft, top: locationInfo.panelTop } : { visibility: 'hidden' }
              }
            >
              {popoverContent}
            </div>
          </Transition>
        </div>
      </PopoverStackPortal>
    </>
  )
}

function PopoverButton({ $isRenderByMain, domRef, children, className }: PopoverButtonProps) {
  if (!$isRenderByMain) return null
  return (
    <div ref={domRef} className={`${PopoverButton.name} ${className ?? ''}`}>
      {children}
    </div>
  )
}

function PopoverPanel({
  $isRenderByMain,
  domRef,
  children,
  /** attach to whole, both arrow and panel  */
  className,
  /** attach to whole, both arrow and panel  */
  style
}: PopoverPanelProps) {
  if (!$isRenderByMain) return null

  return (
    <div
      ref={domRef}
      className={className}
      style={style}
      onClick={(ev) => {
        ev.stopPropagation()
      }}
    >
      {children as ReactNode}
    </div>
  )
}

Popover.Panel = PopoverPanel
Popover.Button = PopoverButton
