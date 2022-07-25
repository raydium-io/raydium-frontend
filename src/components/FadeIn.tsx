import { ReactNode, useRef } from 'react'
import { twMerge } from 'tailwind-merge'
import { Transition } from '@headlessui/react'

export default function FadeInStable({
  ignoreEnterTransition,
  ignoreLeaveTransition,
  show,
  children
}: {
  ignoreEnterTransition?: boolean
  ignoreLeaveTransition?: boolean
  show?: any
  children?: ReactNode // if immediately, inner content maybe be still not render ready
}) {
  // const [nodeExist, { off: destory }] = useToggle(true)
  const contentRef = useRef<HTMLDivElement>(null)
  const innerChildren = useRef<ReactNode>(children)
  if (children) innerChildren.current = children // TODO: should cache child result for close transition
  const inTransitionDuration = useRef(false) // flag for transition is start from transition cancel
  const cachedElementHeight = useRef<number>() // for transition start may start from transition cancel, which height is not correct
  return (
    <Transition
      show={Boolean(show)}
      appear
      static
      // unmount={false} // TODO: although it will lose state, but not unmount will lose element's height, cause display: none will make height lose. so, have to customized a <Transition> component.
      enter="select-none transition-all duration-200 ease"
      enterFrom="opacity-0"
      enterTo="opacity-100"
      leave="select-none transition-all duration-200 ease"
      leaveFrom="opacity-100"
      leaveTo="opacity-0"
      beforeEnter={() => {
        if (ignoreEnterTransition) {
          contentRef.current?.style.removeProperty('position')
          contentRef.current?.style.removeProperty('visibility')
          return
        }

        window.requestAnimationFrame(() => {
          contentRef.current?.style.removeProperty('position')
          contentRef.current?.style.removeProperty('visibility')

          if (inTransitionDuration.current) {
            contentRef.current?.style.setProperty('height', `${cachedElementHeight.current}px`)
          } else {
            const height = contentRef.current?.clientHeight
            cachedElementHeight.current = height

            // frequent ui action may cause element havn't attach to DOM yet, when occors, just ignore it.
            contentRef.current?.style.setProperty('height', '0')
            /// Force bowser to paint the frame  🤯🤯🤯🤯
            contentRef.current?.clientHeight
            contentRef.current?.style.setProperty('height', `${height}px`)
          }
          inTransitionDuration.current = true
        })
      }}
      afterEnter={() => {
        contentRef.current?.style.removeProperty('height')
        inTransitionDuration.current = false
      }}
      beforeLeave={() => {
        if (ignoreLeaveTransition) return
        if (inTransitionDuration.current) {
          contentRef.current?.style.setProperty('height', `0`)
        } else {
          const height = contentRef.current?.clientHeight
          cachedElementHeight.current = height

          contentRef.current?.style.setProperty('height', `${height}px`)
          // Force bowser to paint the frame  🤯🤯🤯🤯
          contentRef.current?.clientHeight
          contentRef.current?.style.setProperty('height', '0')
        }
        inTransitionDuration.current = true
      }}
      afterLeave={() => {
        contentRef.current?.style.removeProperty('height')
        contentRef.current?.style.setProperty('position', 'absolute')
        contentRef.current?.style.setProperty('visibility', 'hidden')
        innerChildren.current = null // clean from internal storage
        inTransitionDuration.current = false
      }}
    >
      {/* outer div can't set ref for it's being used by headless-ui <Transition/> */}
      <div
        ref={contentRef}
        style={{ position: 'absolute', visibility: 'hidden', transition: '200ms' }}
        className={twMerge(`transition-all duration-200 ease overflow-hidden`)}
      >
        {innerChildren.current}
      </div>
    </Transition>
  )
}

export function FadeIn({
  ignoreEnterTransition,
  ignoreLeaveTransition,
  children
}: {
  ignoreEnterTransition?: boolean
  ignoreLeaveTransition?: boolean
  children?: ReactNode
}) {
  return (
    <FadeInStable
      ignoreEnterTransition={ignoreEnterTransition}
      ignoreLeaveTransition={ignoreLeaveTransition}
      show={Boolean(children)}
    >
      {children}
    </FadeInStable>
  )
}
