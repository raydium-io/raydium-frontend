import React, { ReactNode, useEffect, useRef } from 'react'

import { useHover } from '@/hooks/useHover'
import useToggle from '@/hooks/useToggle'
import { Transition } from '@headlessui/react'

import Card from './Card'
import Icon, { AppHeroIconName } from './Icon'
import Row from './Row'
import { TxHistoryInfo } from '@/application/txHistory/useTxHistory'

export interface NormalNotificationItemInfo {
  type?: 'success' | 'warning' | 'error' | 'info'
  title?: ReactNode
  subtitle?: ReactNode
  description?: ReactNode
}
export interface TxNotificationItemInfo {
  txMode: true
  txInfos: {
    historyInfo: TxHistoryInfo
    state: 'success' | 'error' | 'aborted' | 'queueing' | 'loading'
    txid: string
  }[]
}

const normalItemExistTotalTime = process.env.NODE_ENV === 'development' ? 10 * 60 * 1000 : 4 * 1000 // (ms)

const txItemExistTotalTime = process.env.NODE_ENV === 'development' ? 10 * 60 * 1000 : 2 * 60 * 1000 // (ms)

const colors: Record<
  NormalNotificationItemInfo['type'] & string,
  { heroIconName: AppHeroIconName; ring: string; bg: string; text: string }
> = {
  success: {
    heroIconName: 'check-circle',
    ring: 'ring-[#39d0d8]',
    text: 'text-[#39d0d8]',
    bg: 'bg-[#39d0d8]'
  },
  error: {
    heroIconName: 'exclamation-circle',
    ring: 'ring-[#DA2EEF]',
    text: 'text-[#DA2EEF]',
    bg: 'bg-[#e54bf9]'
  },
  info: {
    heroIconName: 'information-circle',
    ring: 'ring-[#2e7cf8]',
    text: 'text-[#2e7cf8]',
    bg: 'bg-[#92bcff]'
  },
  warning: {
    heroIconName: 'exclamation',
    ring: 'ring-[#D8CB39]',
    text: 'text-[#D8CB39]',
    bg: 'bg-[#D8CB39]'
  }
}

function NotificationItemCard(props: { itemInfo: NormalNotificationItemInfo; close: () => void }) {
  const {
    itemInfo: { title, description, type = 'info', subtitle },
    close
  } = props

  const [isTimePassing, { off: pauseTimeline, on: resumeTimeline }] = useToggle(true)
  const timeoutController = useRef(
    spawnTimeoutControllers({ callback: close, totalDuration: normalItemExistTotalTime })
  )
  const itemRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    timeoutController.current.start()
  }, [])
  useHover(itemRef, {
    onHover({ is: now }) {
      if (now === 'start') {
        timeoutController.current.pause()
        pauseTimeline()
      } else {
        timeoutController.current.resume()
        resumeTimeline()
      }
    }
  })

  return (
    <Card
      domRef={itemRef}
      className={`min-w-[260px] relative rounded-xl ring-1.5 ring-inset ${colors[type].ring} bg-[#1B1659] py-4 pl-5 pr-10 mx-4 my-2 overflow-hidden pointer-events-auto`}
    >
      {/* timeline */}
      <div className="h-1 absolute top-0 left-0 right-0">
        {/* track */}
        <div className={`opacity-5 ${colors[type].bg} absolute inset-0`} />
        {/* remain-line */}
        <div
          className={`${colors[type].bg} absolute inset-0`}
          style={{
            animation: `shrink ${normalItemExistTotalTime}ms linear forwards`,
            animationPlayState: isTimePassing ? 'running' : 'paused'
          }}
        />
      </div>

      <Icon
        size="sm"
        heroIconName="x"
        className="absolute right-3 top-3 clickable text-[rgba(171,196,255,0.5)]"
        onClick={() => {
          timeoutController.current.cancel()
          close()
        }}
      />
      {/* <Icon
     heroIconName="x"
     onClick={close}
     className="rounded-full absolute top-3 right-1 h-5 w-5 text-secondary cursor-pointer"
    /> */}
      <Row className="gap-3">
        <Icon heroIconName={colors[type].heroIconName} className={colors[type].text} />
        <div>
          <div className="font-medium text-base text-white">{title}</div>
          {subtitle && <div className="font-normal text-base mobile:text-sm text-[#ABC4FF]">{subtitle}</div>}
          {description && (
            <div className="font-medium text-sm mobile:text-xs text-[rgba(171,196,255,0.5)]">{description}</div>
          )}
        </div>
      </Row>
    </Card>
  )
}

export default function NotificationItem(itemInfo: NormalNotificationItemInfo) {
  const [isOpen, { off: close }] = useToggle(true)
  const [nodeExist, { off: destory }] = useToggle(true)

  // for transition
  const itemWrapperRef = useRef<HTMLDivElement>(null)

  if (!nodeExist) return null
  return (
    <Transition
      appear
      show={isOpen}
      enter="transition-all duration-500"
      enterFrom="opacity-0 transform pc:origin-right-bottom pc:translate-x-full mobile:-translate-y-full scale-0" // transform direction is controlled by translate-x-full
      enterTo="opacity-100 transform pc:origin-right-bottom pc:translate-x-0 mobile:translate-y-0 scale-100"
      leave="transition-all duration-500"
      leaveFrom="opacity-100 transform pc:origin-right-bottom pc:translate-x-0 mobile:translate-y-0 scale-100"
      leaveTo="opacity-0 transform pc:origin-right-bottom pc:translate-x-full mobile:-translate-y-full scale-0"
      beforeEnter={() => {
        // seems headlessui/react 1.6 will get react 18's priority strategy. 👇 fllowing code will invoke **before** element load
        itemWrapperRef.current?.style.setProperty('position', 'absolute') // init will rerender element, "position:absolute" is for not affect others
        itemWrapperRef.current?.style.setProperty('visibility', 'hidden')

        setTimeout(() => {
          itemWrapperRef.current?.style.removeProperty('position')
          const height = itemWrapperRef.current?.clientHeight
          itemWrapperRef.current?.style.setProperty('height', '0')
          // get a layout property to manually to force the browser to layout the above code.
          // So trick. But have to.🤯🤯🤯🤯
          itemWrapperRef.current?.clientHeight
          itemWrapperRef.current?.style.setProperty('height', `${height}px`)
          itemWrapperRef.current?.style.removeProperty('visibility')
        })
      }}
      afterEnter={() => {
        itemWrapperRef.current?.style.removeProperty('height')
      }}
      beforeLeave={() => {
        setTimeout(() => {
          const height = itemWrapperRef.current?.clientHeight
          itemWrapperRef.current?.style.setProperty('height', `${height}px`)
          // get a layout property to manually to force the browser to layout the above code.
          // So trick. But have to.🤯🤯🤯🤯
          itemWrapperRef.current?.clientHeight
          itemWrapperRef.current?.style.setProperty('height', '0')
        })
      }}
      afterLeave={() => {
        destory()
      }}
    >
      {/* U have to gen another <div> to have the gap between <NotificationItem> */}
      <div ref={itemWrapperRef} className={`overflow-hidden mobile:w-screen transition-all duration-500`}>
        <NotificationItemCard itemInfo={itemInfo} close={close}></NotificationItemCard>
      </div>
    </Transition>
  )
}

function spawnTimeoutControllers(options: { callback: () => void; totalDuration: number }) {
  let dead = false
  let startTimestamp: number
  let remainTime = options.totalDuration
  let id: any
  const timeFunction = () => {
    options.callback()
    dead = true
  }
  function start() {
    startTimestamp = globalThis.performance.now()
    if (dead) return
    id = globalThis.setTimeout(timeFunction, remainTime)
  }
  function pause() {
    const endTimestamp = globalThis.performance.now()
    remainTime -= endTimestamp - startTimestamp
    globalThis.clearTimeout(id)
  }
  function resume() {
    start()
  }
  function cancel() {
    globalThis.clearTimeout(id)
    dead = true
  }
  return {
    dead,
    remainTime,
    start,
    pause,
    resume,
    cancel
  }
}
