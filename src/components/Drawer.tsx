import React, { Fragment, ReactNode, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { Transition } from '@headlessui/react'

import { twMerge } from 'tailwind-merge'

import { inClient } from '@/functions/judgers/isSSR'
import { shrinkToValue } from '@/functions/shrinkToValue'
import useTwoStateSyncer from '@/hooks/use2StateSyncer'
import { MayFunction } from '@/types/constants'

export const DRAWER_STACK_ID = 'drawer-stack'

const placementClasses = {
  'from-left': {
    absolutePostion: 'left-0 top-0 bottom-0',
    translateFadeOut: '-translate-x-full'
  },
  'from-bottom': {
    absolutePostion: 'bottom-0 left-0 right-0',
    translateFadeOut: 'translate-y-full'
  },
  'from-right': {
    absolutePostion: 'right-0 top-0 bottom-0',
    translateFadeOut: 'translate-x-full'
  },
  'from-top': {
    absolutePostion: 'top-0 left-0 right-0',
    translateFadeOut: '-translate-y-full'
  }
}

export interface DrawerProps {
  className?: string
  style?: React.CSSProperties
  children?: MayFunction<
    ReactNode,
    [
      {
        close(): void
      }
    ]
  >
  open: boolean
  placement?: 'from-left' | 'from-bottom' | 'from-top' | 'from-right'
  transitionSpeed?: 'fast' | 'normal'
  // if content is scrollable, PLEASE open it!!!, for blur will make scroll super fuzzy
  maskNoBlur?: boolean
  canClosedByMask?: boolean
  onOpen?: () => void
  /** fired before close transform effect is end */
  onCloseImmediately?: () => void
  onClose?(): void
}
const DrawerStackPortal = ({ children }) => {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)

    return () => setMounted(false)
  }, [])

  return mounted && inClient && document.querySelector(`#${DRAWER_STACK_ID}`)
    ? createPortal(children, document.querySelector(`#${DRAWER_STACK_ID}`)!)
    : null
}

export default function Drawer({
  className,
  style,
  children,
  open,
  placement = 'from-left',
  transitionSpeed = 'normal',
  maskNoBlur,
  canClosedByMask = true,
  onOpen,
  onCloseImmediately,
  onClose
}: DrawerProps) {
  const drawerContentRef = useRef<HTMLDivElement>(null)

  // for onCloseTransitionEnd
  // during leave transition, open is still true, but innerOpen is false, so transaction will happen without props:open has change (if open is false, React may destory this component immediately)
  const [innerOpen, setInnerOpen] = useState(open)

  useEffect(() => {
    if (open) onOpen?.()
  }, [open])

  const openDrawer = () => setInnerOpen(true)
  const closeDrawer = () => setInnerOpen(false)

  useTwoStateSyncer({
    state1: open,
    state2: innerOpen,
    onState1Changed: (open) => {
      open ? openDrawer() : closeDrawer()
    }
  })

  return (
    <DrawerStackPortal>
      <Transition as={Fragment} appear show={innerOpen} beforeLeave={onCloseImmediately} afterLeave={onClose}>
        <div className="Drawer w-full h-full fixed">
          <Transition.Child
            as={Fragment}
            enter={`ease-out ${transitionSpeed === 'fast' ? 'duration-150' : 'duration-300'} transition`}
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave={`ease-in ${transitionSpeed === 'fast' ? 'duration-100' : 'duration-200'} transition`}
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div
              className={`absolute inset-0 ${
                maskNoBlur ? '' : 'backdrop-filter backdrop-blur'
              } bg-[rgba(25,19,88,0.5)] ${canClosedByMask ? '' : 'pointer-events-none'}`}
              onClick={() => {
                if (canClosedByMask) closeDrawer()
              }}
            ></div>
          </Transition.Child>
          <Transition.Child
            as={Fragment}
            enter={`ease-out ${transitionSpeed === 'fast' ? 'duration-150' : 'duration-300'} transform transition`}
            enterFrom={`${placementClasses[placement].translateFadeOut}`}
            enterTo=""
            leave={`ease-out ${transitionSpeed === 'fast' ? 'duration-150' : 'duration-300'} transform transition`}
            leaveFrom=""
            leaveTo={`${placementClasses[placement].translateFadeOut}`}
          >
            <div
              className={twMerge(`absolute ${placementClasses[placement].absolutePostion}`, className)}
              style={style}
              ref={drawerContentRef}
            >
              {shrinkToValue(children, [{ open: openDrawer, close: closeDrawer }])}
            </div>
          </Transition.Child>
        </div>
      </Transition>
    </DrawerStackPortal>
  )
}
