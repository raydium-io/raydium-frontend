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
        if (ignoreEnterTransition) return

        window.requestAnimationFrame(() => {
          const height = contentRef.current?.clientHeight
          contentRef.current?.style.removeProperty('position')
          contentRef.current?.style.removeProperty('visibility')

          // frequent ui action may cause element havn't attach to DOM yet, when occors, just ignore it.
          contentRef.current?.style.setProperty('height', '0')
          // get a layout property to manually to force the browser to layout the above code.
          // So trick. But have to.🤯🤯🤯🤯
          contentRef.current?.clientHeight
          contentRef.current?.style.setProperty('height', `${height}px`)
        })
      }}
      afterEnter={() => {
        contentRef.current?.style.removeProperty('height')
      }}
      beforeLeave={() => {
        if (ignoreLeaveTransition) return
        const height = contentRef.current?.clientHeight
        contentRef.current?.style.setProperty('height', `${height}px`)
        // get a layout property to manually to force the browser to layout the above code.
        // So trick. But have to.🤯🤯🤯🤯
        contentRef.current?.clientHeight
        contentRef.current?.style.setProperty('height', '0')
      }}
      afterLeave={() => {
        contentRef.current?.style.removeProperty('height')
        contentRef.current?.style.setProperty('position', 'absolute')
        contentRef.current?.style.setProperty('visibility', 'hidden')
        innerChildren.current = null // clean from internal storage
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
