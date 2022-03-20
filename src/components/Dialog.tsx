import React, { CSSProperties, Fragment, ReactNode, useEffect } from 'react'

import { Dialog as _Dialog, Transition } from '@headlessui/react'

import { twMerge } from 'tailwind-merge'

import { shrinkToValue } from '@/functions/shrinkToValue'
import { MayFunction } from '@/types/generics'

export interface DialogProps {
  open: boolean
  /** this is the className of modal card */
  className?: string
  style?: CSSProperties
  children?: MayFunction<
    ReactNode,
    [
      {
        close: () => void
      }
    ]
  >
  transitionSpeed?: 'fast' | 'normal'
  onClose?(): void
  /** fired when close transform effect is end */
  onCloseTransitionEnd?(): void
}

export default function Dialog({
  open,
  children,
  className,
  transitionSpeed = 'normal',
  style,
  onClose,
  onCloseTransitionEnd
}: DialogProps) {
  // for onCloseTransitionEnd
  // during leave transition, open is still true, but innerOpen is false, so transaction will happen without props:open has change (if open is false, React may destory this component immediately)
  const [innerOpen, setInnerOpen] = React.useState(open)
  useEffect(() => {
    setInnerOpen(open)
  }, [open])
  return (
    <Transition as={Fragment} show={innerOpen} appear beforeLeave={onClose} afterLeave={onCloseTransitionEnd}>
      <_Dialog
        open={innerOpen}
        static
        as="div"
        className="fixed inset-0 z-model overflow-y-auto"
        onClose={() => setInnerOpen(false)}
      >
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
            <_Dialog.Overlay className="fixed inset-0 backdrop-filter backdrop-blur bg-[rgba(20,16,65,0.4)]" />
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
                `absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2  transition-all z-10`,
                className
              )}
              style={{
                /** to comply to the space occupation of side-bar */
                // @ts-expect-error style don't accept css variable. but it should can.
                '--tw-translate-x': "calc(var('--side-menu-width') * 1px / 2)",
                ...style
              }}
            >
              {shrinkToValue(children, [{ close: () => setInnerOpen(false) }])}
            </div>
          </Transition.Child>
        </div>
      </_Dialog>
    </Transition>
  )
}
