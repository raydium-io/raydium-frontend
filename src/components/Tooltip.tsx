import React, { ComponentProps, ReactNode, RefObject, useImperativeHandle, useMemo, useRef } from 'react'

import { red } from 'bn.js'
import { twMerge } from 'tailwind-merge'

import useAppSettings from '@/application/common/useAppSettings'
import addPropsToReactElement from '@/functions/react/addPropsToReactElement'
import mergeRef from '@/functions/react/mergeRef'
import { pickReactChild } from '@/functions/react/pickChild'
import { shrinkToValue } from '@/functions/shrinkToValue'
import { MayFunction } from '@/types/constants'

import Card from './Card'
import Popover, { PopoverHandles, PopoverPlacement, PopoverProps } from './Popover'

export type TooltipHandle = {
  open(): void
  close(): void
}

export interface TooltipProps {
  componentRef?: RefObject<any>
  className?: string
  panelClassName?: string
  arrowClassName?: string
  children?: ReactNode
  /** usually it's for debug */
  forceOpen?: boolean
  /** if it's closed, can't open any more. Just like <Tooltip> has no use */
  disable?: boolean
  placement?: PopoverPlacement
  triggerBy?: PopoverProps['triggerBy']
  closeBy?: PopoverProps['closeBy']
  defaultOpen?: PopoverProps['defaultOpen']
  darkGradient?: boolean
}

// TODO: it should be an pre-config version of <Popover>
export default function Tooltip({
  componentRef,
  className,
  panelClassName,
  arrowClassName,
  children,
  forceOpen,
  placement = 'top',
  triggerBy,
  closeBy = 'click-outside-but-trigger',
  disable,
  defaultOpen,
  darkGradient = false
}: TooltipProps) {
  const innerComponentRef = useRef<PopoverHandles>()
  const content = useMemo(
    () =>
      pickReactChild(children, TooltipPanel, (el) =>
        addPropsToReactElement<ComponentProps<typeof TooltipPanel>>(el, {
          $isRenderByMain: true,
          $popoverRef: innerComponentRef
        })
      ),
    [children]
  )
  const isMobile = useAppSettings((s) => s.isMobile)

  const darkGradientMain = 'bg-[transparent]'
  return (
    <Popover
      componentRef={mergeRef(componentRef, innerComponentRef)}
      canOpen={!disable}
      placement={placement}
      defaultOpen={defaultOpen}
      triggerBy={isMobile ? triggerBy ?? 'click' : triggerBy ?? 'hover'}
      forceOpen={forceOpen}
      className={className}
      triggerDelay={100}
      closeBy={closeBy}
      closeDelay={100}
    >
      <Popover.Button>{children}</Popover.Button>
      <Popover.Panel>
        {({ locationInfo }) => (
          <div className="relative">
            <div
              className={twMerge(
                'w-2 h-2 absolute bg-[#0C0926] rotate-45 -translate-x-1 -translate-y-1',
                darkGradient ? darkGradientMain : '',
                arrowClassName
              )}
              style={
                locationInfo
                  ? {
                      top: locationInfo.arrowTopRelativeToPanel,
                      left: locationInfo.arrowLeftRelativeToPanel
                    }
                  : {
                      visibility: 'hidden'
                    }
              }
            />
            <Card
              className={twMerge('TooltipPanel p-4 bg-[#0C0926] rounded-lg text-xs text-white', panelClassName)}
              style={{
                background: darkGradient
                  ? 'linear-gradient(140.14deg, rgba(0, 182, 191, 0.15) 0%, rgba(27, 22, 89, 0.1) 86.61%), linear-gradient(321.82deg, #18134D 0%, #1B1659 100%)'
                  : 'default',
                border: darkGradient ? '1px solid  rgba(171, 196, 255, 0.2)' : 'none'
              }}
              // style={{
              //   background: darkGradient ? 'linear-gradient(126.6deg, #2c3971, #21265d 100%)' : 'default',
              //   border: darkGradient ? '1px solid  rgba(171, 196, 255, 0.2)' : 'none'
              // }}
            >
              {content}
            </Card>
          </div>
        )}
      </Popover.Panel>
    </Popover>
  )
}

/**
 * already has basic tooltip panel style
 *
 * it is in same level of
 */
export function TooltipPanel({
  $isRenderByMain,
  $popoverRef,
  children,
  className
}: {
  $isRenderByMain?: boolean
  $popoverRef?: React.MutableRefObject<PopoverHandles | undefined>
  children?: MayFunction<ReactNode, [popoverHandles: PopoverHandles | undefined]>
  className?: string
}) {
  if (!$isRenderByMain) return null
  return <div className={className}>{shrinkToValue(children, [$popoverRef?.current])}</div>
}
Tooltip.Panel = TooltipPanel
