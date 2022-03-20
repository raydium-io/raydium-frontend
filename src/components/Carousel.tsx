import React, { ReactNode, useEffect, useRef, useState } from 'react'

import { shrinkToValue } from '@/functions/shrinkToValue'
import useDevice from '@/hooks/useDevice'

import Icon from './Icon'
import Row from './Row'

export default function Carousel<T>({
  list,
  key,
  children
}: {
  list: T[]
  key?: (info: T, index: number) => string
  children?: (info: T, index: number, reset: () => void) => ReactNode
}) {
  const { isMobile } = useDevice()
  const [timeoutRefresher, setTimeoutRefresher] = useState(0)
  const [currentActiveTabIndex, setCurrentActiveTabIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  async function setTabIndex(targetTabIndex: number, isSmooth = true): Promise<HTMLDivElement> {
    return new Promise((resolve, reject) => {
      const targetScrollLeft = containerRef.current!.clientWidth * targetTabIndex
      containerRef.current?.scroll({
        left: targetScrollLeft,
        behavior: isSmooth ? 'smooth' : 'auto'
      })

      function scrollDetector(ev: Event) {
        // console.log('2233: ', targetScrollLeft, (ev.target as HTMLDivElement).scrollLeft)
        const diff = (ev.target as HTMLDivElement).scrollLeft - targetScrollLeft
        if (Math.abs(diff) < 1) {
          resolve(ev.target as HTMLDivElement)
          containerRef.current?.removeEventListener('scroll', scrollDetector)
          containerRef.current?.removeEventListener('pointerdown', pointerdownDetector)
        }
      }
      function pointerdownDetector() {
        // ('cancal by user scroll')
        containerRef.current?.removeEventListener('scroll', scrollDetector)
        containerRef.current?.removeEventListener('pointerdown', pointerdownDetector)
      }
      containerRef.current?.addEventListener('scroll', scrollDetector, { passive: true })
      containerRef.current?.addEventListener('pointerdown', pointerdownDetector, { passive: true })
    })
  }

  function resetTabIndex() {
    setTabIndex(0, false)
  }

  async function goTo(targetIndex: number | ((v: number) => number)) {
    if (!containerRef.current) return
    const currentTabIndex = Math.round(containerRef.current.scrollLeft / containerRef.current.clientWidth) % list.length
    const targetTabIndex = shrinkToValue(targetIndex, [currentTabIndex]) % list.length
    setTimeoutRefresher((i) => i + 1)
    return setTabIndex(targetTabIndex)
  }

  async function goNext() {
    if (!containerRef.current) return
    const currentTabIndex = Math.round(containerRef.current.scrollLeft / containerRef.current.clientWidth) % list.length
    const targetTabIndex = (currentTabIndex + 1) % list.length
    setTimeoutRefresher((i) => i + 1)
    if (targetTabIndex === 0 && currentTabIndex === list.length - 1) {
      return setTabIndex(list.length).then(() => setTabIndex(targetTabIndex, false))
    } else {
      return setTabIndex(targetTabIndex)
    }
  }

  async function goPrev() {
    if (!containerRef.current) return
    const currentTabIndex = Math.round(containerRef.current.scrollLeft / containerRef.current.clientWidth) % list.length
    const targetTabIndex = (currentTabIndex - 1 + list.length) % list.length
    setTimeoutRefresher((i) => i + 1)
    if (targetTabIndex === list.length - 1 && currentTabIndex === 0) {
      return setTabIndex(list.length, false).then(() =>
        // force render of dom
        setTimeout(() => {
          setTabIndex(targetTabIndex)
        }, 0)
      )
    } else {
      return setTabIndex(targetTabIndex)
    }
  }

  useEffect(() => {
    if (list.length <= 1) return
    const timeoutId = setTimeout(goNext, 6000)
    return () => clearTimeout(timeoutId)
  }, [goNext, list, timeoutRefresher])

  useEffect(() => {
    if (!containerRef.current) return
    containerRef.current.addEventListener(
      'scroll',
      (ev) => {
        const currentTabIndex =
          Math.round((ev.target as HTMLElement).scrollLeft / (ev.target as HTMLElement).clientWidth) % list.length
        setCurrentActiveTabIndex(currentTabIndex)
      },
      { passive: true }
    )
  }, [])

  return (
    <div className="grid grid-cols-[auto,1fr,auto] justify-items-center items-center gap-2 gap-y-4 mobile:gap-y-2">
      {!isMobile && list.length !== 1 && (
        <Icon heroIconName="chevron-left" className="opacity-80 cursor-pointer" onClick={goPrev} />
      )}
      <div
        className="flex sadf items-center overflow-auto no-scrollbar"
        ref={containerRef}
        style={{ scrollSnapType: 'x proximity' }}
      >
        {list.map((info, idx) => (
          <div
            key={key?.(info, idx) ?? idx}
            className="relative flex-shrink-0  w-full h-full"
            style={{ scrollSnapAlign: 'center' }}
          >
            {children?.(info, idx, resetTabIndex)}
          </div>
        ))}
        {list.map((info, idx) => (
          <div
            key={'shadow' + String(key?.(info, idx) ?? idx)}
            className="relative flex-shrink-0  w-full h-full"
            style={{ scrollSnapAlign: 'center' }}
          >
            {children?.(info, idx, resetTabIndex)}
          </div>
        ))}
      </div>
      {!isMobile && list.length !== 1 && (
        <Icon heroIconName="chevron-right" className="opacity-80 cursor-pointer" onClick={goNext} />
      )}
      {list.length !== 1 && (
        <Row className="space-x-2 col-span-full">
          {list.map((_info, idx) => (
            <div
              key={idx}
              className={`w-2 h-2 bg-white ${
                idx === currentActiveTabIndex ? 'bg-opacity-75 cursor-not-allowed' : 'bg-opacity-25 cursor-pointer'
              } rounded-full`}
              onClick={() => goTo(idx)}
            />
          ))}
        </Row>
      )}
    </div>
  )
}
