import React, { CSSProperties, Fragment, ReactNode, useEffect, useRef, useState } from 'react'

import { Dialog as _Dialog, Transition } from '@headlessui/react'

import { twMerge } from 'tailwind-merge'

import { shrinkToValue } from '@/functions/shrinkToValue'
import { MayFunction } from '@/types/generics'
import useAppSettings from '@/application/appSettings/useAppSettings'
import useTwoStateSyncer from '@/hooks/use2StateSyncer'
import { useToggleRef } from '@/hooks/useToggle'
import { useSignalState } from '@/hooks/useSignalState'

export interface DialogProps {
  open: boolean
  /** this is the className of modal card */
  className?: string
  style?: CSSProperties
  children?: MayFunction<ReactNode, [{ close: () => void }]>
  transitionSpeed?: 'fast' | 'normal'
  // if content is scrollable, PLEASE open it!!!, for blur will make scroll super fuzzy
  maskNoBlur?: boolean

  canClosedByMask?: boolean
  onClose?(): void
  /** fired when close transform effect is end */
  onCloseTransitionEnd?(): void
}

export default function Dialog({
  open,
  children,
  className,
  transitionSpeed = 'normal',
  maskNoBlur,
  style,
  canClosedByMask = true,
  onClose,
  onCloseTransitionEnd
}: DialogProps) {
  // for onCloseTransitionEnd
  // during leave transition, open is still true, but innerOpen is false, so transaction will happen without props:open has change (if open is false, React may destory this component immediately)
  const [innerOpen, setInnerOpen, innerOpenSignal] = useSignalState(open)
  const isMobile = useAppSettings((s) => s.isMobile)

  const [isDuringTransition, { delayOff: transactionFlagDelayOff, on: transactionFlagOn }] = useToggleRef(false, {
    delay: transitionSpeed === 'fast' ? 100 : 200 /* transition time */,
    onOff: () => {
      // seems headlessui/react 1.6 doesn't fired this certainly(because React 16 priority strategy), so i have to use setTimeout 👇 in <Dialog>'s onClose
      if (!innerOpenSignal()) {
        onCloseTransitionEnd?.()
      }
    }
  })

  const openDialog = () => {
    setInnerOpen(true)
    transactionFlagOn() // to make sure 👇 setTimout would not remove something if transaction has canceled
    transactionFlagDelayOff()
  }

  const closeDialog = () => {
    setInnerOpen(false)
    transactionFlagOn() // to make sure 👇 setTimout would not remove something if transaction has canceled
    transactionFlagDelayOff()
  }

  useTwoStateSyncer({
    state1: open,
    state2: innerOpen,
    onState1Changed: (open) => {
      open ? openDialog() : closeDialog()
    }
  })

  if (!open) return null
  return (
    <Transition
      as={Fragment}
      show={innerOpen}
      appear
      beforeLeave={onClose}
      // afterLeave={() => {
      //   // seems headlessui/react 1.6 doesn't fired this certainly(because React 16 priority strategy), so i have to use setTimeout 👇 in <Dialog>'s onClose
      //   console.log('onCloseTransitionEnd')
      //   return onCloseTransitionEnd?.()
      // }}
    >
      <_Dialog open={innerOpen} static as="div" className="fixed inset-0 z-model overflow-y-auto" onClose={closeDialog}>
        <div className="Dialog w-screen h-screen fixed">
          <Transition.Child
            as={Fragment}
            enter={`ease-out ${transitionSpeed === 'fast' ? 'duration-150' : 'duration-300'} transition`}
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave={`ease-in ${transitionSpeed === 'fast' ? 'duration-100' : 'duration-200'} transition`}
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <_Dialog.Overlay
              className={`fixed inset-0 ${maskNoBlur ? '' : 'backdrop-filter backdrop-blur'} bg-[rgba(20,16,65,0.4)] ${
                canClosedByMask ? '' : 'pointer-events-none'
              }`}
            />
          </Transition.Child>

          <Transition.Child
            as={Fragment}
            enter={`ease-out ${transitionSpeed === 'fast' ? 'duration-150' : 'duration-300'}`}
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave={`ease-in ${transitionSpeed === 'fast' ? 'duration-100' : 'duration-200'}`}
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <div
              className={twMerge(
                `absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2  transition-all z-10 self-pointer-events-none`,
                className
              )}
              style={style}
            >
              <div
                style={{
                  /** to comply to the space occupation of side-bar */
                  transform: isMobile ? undefined : 'translateX(calc(var(--side-menu-width) * 1px / 2))'
                }}
              >
                {shrinkToValue(children, [{ close: closeDialog }])}
              </div>
            </div>
          </Transition.Child>
        </div>
      </_Dialog>
    </Transition>
  )
}
