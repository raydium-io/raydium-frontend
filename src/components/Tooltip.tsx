import React, { ComponentProps, ReactNode, RefObject, useImperativeHandle, useMemo } from 'react'

import { twMerge } from 'tailwind-merge'

import addPropsToReactElement from '@/functions/react/addPropsToReactElement'
import { pickReactChild } from '@/functions/react/pickChild'

import Card from './Card'
import Popover, { PopoverPlacement, PopoverProps } from './Popover'

export type TooltipHandle = {
  open(): void
  close(): void
}

export interface TooltipProps {
  componentRef?: RefObject<any>
  className?: string
  panelClassName?: string
  children?: ReactNode
  /** usually it's for debug */
  forceOpen?: boolean
  /** if it's closed, can't open any more. Just like <Tooltip> has no use */
  disable?: boolean
  placement?: PopoverPlacement
  triggerBy?: PopoverProps['triggerBy']
  defaultOpen?: PopoverProps['defaultOpen']
}

// TODO: it should be an pre-config version of <Popover>
export default function Tooltip({
  componentRef,
  className,
  panelClassName,
  children,
  forceOpen,
  placement = 'top',
  triggerBy = 'hover',
  disable,
  defaultOpen
}: TooltipProps) {
  const content = useMemo(
    () =>
      pickReactChild(children, TooltipPanel, (el) =>
        addPropsToReactElement<ComponentProps<typeof TooltipPanel>>(el, {
          $isRenderByMain: true
        })
      ),
    [children]
  )

  return (
    <Popover
      componentRef={componentRef}
      canOpen={!disable}
      placement={placement}
      defaultOpen={defaultOpen}
      triggerBy={triggerBy}
      forceOpen={forceOpen}
      className={className}
      triggerDelay={100}
      closeDelay={200}
    >
      <Popover.Button>{children}</Popover.Button>
      <Popover.Panel>
        {({ locationInfo }) => (
          <div className="relative">
            <div
              className="w-2 h-2 absolute bg-[#0C0926] rotate-45 -translate-x-1 -translate-y-1"
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
            <Card className={twMerge('TooltipPanel p-4 bg-[#0C0926] rounded text-xs text-white', panelClassName)}>
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
  children,
  className
}: {
  $isRenderByMain?: boolean
  children?: ReactNode
  className?: string
}) {
  if (!$isRenderByMain) return null
  return <div className={className}>{children}</div>
}
Tooltip.Panel = TooltipPanel
