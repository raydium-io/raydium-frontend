import { ReactNode, useRef } from 'react'
import { twMerge } from 'tailwind-merge'

import { Transition } from '@headlessui/react'

export default function FadeInStable({ show, children }: { show?: any; children?: ReactNode }) {
  // const [nodeExist, { off: destory }] = useToggle(true)
  const contentRef = useRef<HTMLDivElement>(null)
  const trueHeight = useRef<number | undefined>()
  return (
    <Transition
      show={Boolean(show)}
      // unmount={false} // TODO: although it will lose state, but not unmount will lose element's height, cause display: none will make height lose. so, have to customized a <Transition> component.
      enter="select-none transition-all duration-200 ease"
      enterFrom="opacity-0"
      enterTo="opacity-100"
      leave="select-none transition-all duration-200 ease"
      leaveFrom="opacity-100"
      leaveTo="opacity-0"
      beforeEnter={() => {
        // seems headlessui/react 1.6 will get react 18's priority strategy. 👇 fllowing code will invoke **before** element load
        setTimeout(() => {
          if (!contentRef.current?.style.height) {
            // only if it is invoked after the afterLeave or init
            trueHeight.current = contentRef.current?.clientHeight
          }
          contentRef.current?.style.setProperty('height', '0')
          // get a layout property to manually to force the browser to layout the above code.
          // So trick. But have to.🤯🤯🤯🤯
          contentRef.current?.clientHeight
          contentRef.current?.style.setProperty('height', `${trueHeight.current}px`)
        })
      }}
      afterEnter={() => {
        // seems headlessui/react 1.6 will get react 18's priority strategy. 👇 fllowing code will invoke **before** element unload
        setTimeout(() => {
          contentRef.current?.style.removeProperty('height')
        })
      }}
      beforeLeave={() => {
        // seems headlessui/react 1.6 will get react 18's priority strategy. 👇 fllowing code will invoke **before** element load
        setTimeout(() => {
          if (!contentRef.current?.style.height) {
            // only if it is invoked after the afterEnter
            trueHeight.current = contentRef.current?.clientHeight
          }
          contentRef.current?.style.setProperty('height', `${trueHeight.current}px`)
          // get a layout property to manually to force the browser to layout the above code.
          // So trick. But have to.🤯🤯🤯🤯
          contentRef.current?.clientHeight
          contentRef.current?.style.setProperty('height', '0')
        })
      }}
      afterLeave={() => {
        // seems headlessui/react 1.6 will get react 18's priority strategy. 👇 fllowing code will invoke **before** element unload
        setTimeout(() => {
          contentRef.current?.style.removeProperty('height')
        })
      }}
    >
      {/* outer div can't set ref for it's being used by headless-ui <Transition/> */}
      <div ref={contentRef} className={twMerge('transition-all duration-200 ease overflow-hidden')}>
        {children}
      </div>
    </Transition>
  )
}

export function FadeIn({
  noOpenTransitation,
  className,
  children
}: {
  noOpenTransitation?: boolean
  className?: string
  children?: ReactNode
}) {
  // const [nodeExist, { off: destory }] = useToggle(true)
  const contentRef = useRef<HTMLDivElement>(null)
  const innerChildren = useRef<ReactNode>(children)
  if (children) innerChildren.current = children
  const trueHeight = useRef<number | undefined>()
  return (
    <Transition
      appear
      show={Boolean(children)}
      enter={`select-none transition-all duration-200 ease`}
      enterFrom="opacity-0"
      enterTo="opacity-100"
      leave={`select-none transition-all duration-200 ease`}
      leaveFrom="opacity-100"
      leaveTo="opacity-0"
      beforeEnter={() => {
        if (noOpenTransitation) return
        if (!contentRef.current?.style.height) {
          // only if it is invoked after the afterLeave or init
          trueHeight.current = contentRef.current?.clientHeight
        }
        contentRef.current?.style.setProperty('height', '0')
        // get a layout property to manually to force the browser to layout the above code.
        // So trick. But have to.🤯🤯🤯🤯
        contentRef.current?.clientHeight
        contentRef.current?.style.setProperty('height', `${trueHeight.current}px`)
      }}
      afterEnter={() => {
        if (noOpenTransitation) return
        setTimeout(() => {
          // seems headlessui/react 1.6 will get react 18's priority strategy. 👇 fllowing code will invoke **before** element unload
          contentRef.current?.style.removeProperty('height')
        })
      }}
      beforeLeave={() => {
        // seems headlessui/react 1.6 will get react 18's priority strategy. 👇 fllowing code will invoke **before** element unload
        setTimeout(() => {
          if (!contentRef.current?.style.height) {
            // only if it is invoked after the afterEnter
            trueHeight.current = contentRef.current?.clientHeight
          }
          contentRef.current?.style.setProperty('height', `${trueHeight.current}px`)
          // get a layout property to manually to force the browser to layout the above code.
          // So trick. But have to.🤯🤯🤯🤯
          contentRef.current?.clientHeight
          contentRef.current?.style.setProperty('height', '0')
        })
      }}
      afterLeave={() => {
        // seems headlessui/react 1.6 will get react 18's priority strategy. 👇 fllowing code will invoke **before** element unload
        setTimeout(() => {
          contentRef.current?.style.removeProperty('height')
          innerChildren.current = null
        })
      }}
    >
      <div ref={contentRef} className={`transition-all duration-200 ease overflow-hidden`}>
        {innerChildren.current}
      </div>
    </Transition>
  )
}
