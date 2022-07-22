import { ReactNode, useRef } from 'react'
import { twMerge } from 'tailwind-merge'

import useToggle from '@/hooks/useToggle'
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
  const [isDuringTransition, { off: turnOffDuringTransition, on: turnOnDuringTransition }] = useToggle()
  return (
    <Transition
      show={Boolean(show)}
      appear
      static
      // unmount={false} // TODO: although it will lose state, but not unmount will lose element's height, cause display: none will make height lose. so, have to customized a <Transition> component.
      enter="select-none transition-all duration-1000 ease"
      enterFrom="opacity-0"
      enterTo="opacity-100"
      leave="select-none transition-all duration-1000 ease"
      leaveFrom="opacity-100"
      leaveTo="opacity-0"
      beforeEnter={() => {
        if (ignoreEnterTransition) return
        // seems headlessui/react 1.6 will get react 18's priority strategy. 👇 fllowing code will invoke **before** element load
        contentRef.current?.style.setProperty('position', 'absolute') // init will rerender element, "position:absolute" is for not affect others
        contentRef.current?.style.setProperty('visibility', 'hidden')
        // get a layout property to manually to force the browser to layout the above code.
        // So trick. But have to.🤯🤯🤯🤯
        contentRef.current?.clientHeight
        contentRef.current?.style.removeProperty('position')
        contentRef.current?.style.removeProperty('visibility')

        const height = contentRef.current?.clientHeight
        // frequent ui action may cause element havn't attach to DOM yet, when occors, just ignore it.
        if (height) {
          contentRef.current?.style.setProperty('height', '0')
          // get a layout property to manually to force the browser to layout the above code.
          // So trick. But have to.🤯🤯🤯🤯
          const AFid = window.requestAnimationFrame(() => {
            const t = contentRef.current?.clientHeight
            contentRef.current?.style.setProperty('height', `${height}px`)
            contentRef.current?.addEventListener('transitionend', () => {})
            window.cancelAnimationFrame(AFid)
          })
          // setTimeout(() => {
          //   const t = contentRef.current?.clientHeight
          //   // contentRef.current?.style.setProperty('height', `${height}px`)
          // })
        }
        turnOnDuringTransition()
      }}
      afterEnter={() => {
        contentRef.current?.style.removeProperty('height')
        turnOffDuringTransition()
      }}
      beforeLeave={() => {
        if (ignoreLeaveTransition) return
        contentRef.current?.style.setProperty('position', 'absolute')
        contentRef.current?.style.setProperty('visibility', 'hidden')
        turnOnDuringTransition()
        const height = contentRef.current?.clientHeight
        if (!height) {
          contentRef.current?.style.setProperty('height', '0')
        } else {
          contentRef.current?.style.setProperty('height', `${height}px`)
          // get a layout property to manually to force the browser to layout the above code.
          // So trick. But have to.🤯🤯🤯🤯
          contentRef.current?.clientHeight
          contentRef.current?.style.setProperty('height', '0')
        }
      }}
      afterLeave={() => {
        contentRef.current?.style.removeProperty('height')
        contentRef.current?.style.setProperty('position', 'absolute')
        contentRef.current?.style.setProperty('visibility', 'hidden')
        turnOffDuringTransition()
      }}
    >
      {/* outer div can't set ref for it's being used by headless-ui <Transition/> */}
      <div
        ref={contentRef}
        style={{ position: 'absolute', visibility: 'hidden', transition: '1000ms' }}
        className={twMerge(
          `transition-all duration-1000 ease overflow-hidden ${children || isDuringTransition ? '' : 'hidden'}`
        )}
      >
        {children}
      </div>
    </Transition>
  )
}

export function FadeIn({
  ignoreEnterTransition,
  ignoreLeaveTransition,
  className,
  children
}: {
  ignoreEnterTransition?: boolean
  ignoreLeaveTransition?: boolean
  className?: string
  children?: ReactNode
}) {
  // const [nodeExist, { off: destory }] = useToggle(true)
  const contentRef = useRef<HTMLDivElement>(null)
  const innerChildren = useRef<ReactNode>(children)
  if (children) innerChildren.current = children
  const [isDuringTransition, { off: turnOffDuringTransition, on: turnOnDuringTransition }] = useToggle()
  return (
    <Transition
      appear
      show={Boolean(children)}
      enter={`select-none ${ignoreEnterTransition ? '' : 'transition-all'} duration-200 ease`}
      enterFrom="opacity-0"
      enterTo="opacity-100"
      leave={`select-none ${ignoreLeaveTransition ? '' : 'transition-all'} duration-200 ease`}
      leaveFrom="opacity-100"
      leaveTo="opacity-0"
      beforeEnter={() => {
        if (ignoreEnterTransition) return
        // seems headlessui/react 1.6 will get react 18's priority strategy. 👇 fllowing code will invoke **before** element load

        contentRef.current?.style.removeProperty('position')
        contentRef.current?.style.removeProperty('visibility')

        const height = contentRef.current?.clientHeight
        // frequent ui action may cause element havn't attach to DOM yet, when occors, just ignore it.
        if (height) {
          contentRef.current?.style.setProperty('height', '0')
          // get a layout property to manually to force the browser to layout the above code.
          // So trick. But have to.🤯🤯🤯🤯
          const AFid = window.requestAnimationFrame(() => {
            const t = contentRef.current?.clientHeight
            contentRef.current?.style.setProperty('height', `${height}px`)
            contentRef.current?.addEventListener('transitionend', () => {})
            window.cancelAnimationFrame(AFid)
          })
        }
        turnOnDuringTransition()
      }}
      afterEnter={() => {
        contentRef.current?.style.removeProperty('height')
        turnOffDuringTransition()
      }}
      beforeLeave={() => {
        if (ignoreLeaveTransition) return
        setTimeout(() => {
          const height = contentRef.current?.clientHeight
          if (!height) {
            contentRef.current?.style.setProperty('height', '0')
          } else {
            contentRef.current?.style.setProperty('height', `${height}px`)
            // get a layout property to manually to force the browser to layout the above code.
            // So trick. But have to.🤯🤯🤯🤯
            contentRef.current?.clientHeight
            contentRef.current?.style.setProperty('height', '0')
          }
        })
        turnOnDuringTransition()
      }}
      afterLeave={() => {
        contentRef.current?.style.removeProperty('height')
        turnOffDuringTransition()
      }}
    >
      <div
        ref={contentRef}
        style={{ position: 'absolute', visibility: 'hidden', transition: '1000ms' }}
        className={`transition-all duration-200 ease overflow-hidden ${children || isDuringTransition ? '' : 'hidden'}`}
      >
        {innerChildren.current}
      </div>
    </Transition>
  )
}
