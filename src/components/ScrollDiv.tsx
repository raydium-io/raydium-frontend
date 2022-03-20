import { ReactNode, useEffect, useRef } from 'react'

import { getCssVariable, setCssVarible } from '@/functions/dom/cssVariable'
import { setDataSet } from '@/functions/dom/dataset'
import { attachPointerMove, cancelPointerMove } from '@/functions/dom/gesture/pointerMove'
import { useActive } from '@/hooks/useActive'
import useBFlag from '@/hooks/useBFlag'
import { useHover } from '@/hooks/useHover'

interface ScrollDivProps {
  children?: ReactNode
  className?: string
  slotClassName?: string
  thumbClassName?: string
}
// for high response of interaction, don't use React state
export default function ScrollDiv({ children, className, slotClassName, thumbClassName }: ScrollDivProps) {
  const scrollOuterContainerRef = useRef<HTMLDivElement>(null)
  const scrollInnerContentRef = useRef<HTMLDivElement>(null)
  const scrollSlotRef = useRef<HTMLDivElement>(null)
  const scrollThumbRef = useRef<HTMLDivElement>(null)

  const isScrollThumbActive = useBFlag(false)
  const isScrollThumbHovered = useBFlag(false)
  const isScrollContainerHovered = useBFlag(false)
  const isScrollSlotHovered = useBFlag(false)

  const totalScrollOfInnerContent = useRef(0)
  const totalScrollOfScrollSlot = useRef(0)
  const scrollTop = useRef(0)

  useHover(scrollOuterContainerRef, {
    onHover({ is }) {
      isScrollContainerHovered.set(is === 'start')
    }
  })
  useHover(scrollThumbRef, {
    onHover({ is }) {
      isScrollThumbHovered.set(is === 'start')
    }
  })
  useHover(scrollSlotRef, {
    onHover({ is }) {
      isScrollSlotHovered.set(is === 'start')
    }
  })
  useActive(scrollThumbRef, {
    onActive({ is }) {
      isScrollThumbActive.set(is === 'start')
    }
  })
  // add innerContent listener
  useEffect(() => {
    if (!scrollInnerContentRef.current) return
    scrollInnerContentRef.current.addEventListener(
      'scroll',
      (ev) => {
        if (isScrollThumbActive.isOn()) return
        if (!scrollOuterContainerRef.current || !scrollInnerContentRef.current) return
        const contentEl = ev.target as HTMLDivElement
        const avaliableScroll = Number(getCssVariable(scrollInnerContentRef.current, 'totalScroll') || '0')
        const currentScrollTop = contentEl.scrollTop / avaliableScroll
        setCssVarible(scrollOuterContainerRef.current, 'scrollTop', currentScrollTop)
        scrollTop.current = currentScrollTop
      },
      { passive: true }
    )
  }, [])

  function scrollCotentWithScrollTop() {
    scrollInnerContentRef.current?.scrollTo({
      top: Math.min(1, Math.max(0, scrollTop.current)) * totalScrollOfInnerContent.current
    })
  }

  // add scroll thumb listener ------
  useEffect(() => {
    const eventId = attachPointerMove(scrollThumbRef.current, {
      start() {
        setDataSet(scrollThumbRef.current, 'isScrollThumbActive', true)
        isScrollThumbActive.on()
      },
      end() {
        setDataSet(scrollThumbRef.current, 'isScrollThumbActive', false)
        isScrollThumbActive.off()
      },
      move: ({ currentDeltaInPx }) => {
        const avaliableScroll = Number(getCssVariable(scrollSlotRef.current, 'totalScroll') || '0')
        setCssVarible(scrollOuterContainerRef.current, 'scrollTop', (prev) => {
          const currentScrollTop = Number(prev) + currentDeltaInPx.dy / avaliableScroll
          scrollTop.current = currentScrollTop
          scrollCotentWithScrollTop()
          return currentScrollTop
        })
      }
    })
    return () => cancelPointerMove(eventId)
  }, [])

  // add --total-scroll as soon as innerContent is available
  useEffect(() => {
    if (!scrollInnerContentRef.current) return
    const totalScroll = scrollInnerContentRef.current.scrollHeight - scrollInnerContentRef.current.clientHeight
    setCssVarible(scrollInnerContentRef.current, 'totalScroll', String(totalScroll))
    totalScrollOfInnerContent.current = totalScroll
  }, [])

  // add --total-scroll as soon as scrollbar is available
  useEffect(() => {
    if (!scrollSlotRef.current || !scrollThumbRef.current) return
    const totalScroll = scrollSlotRef.current.clientHeight - scrollThumbRef.current.clientHeight
    setCssVarible(scrollSlotRef.current, 'totalScroll', String(totalScroll))
    totalScrollOfScrollSlot.current = totalScroll
  }, [])

  return (
    <div ref={scrollOuterContainerRef} className={`ScrollDiv w-full relative ${className ?? ''}`}>
      <div
        className={[
          'ScrollDiv-scrollbar-slot absolute right-0 top-0 bottom-0',
          `transition-all ${isScrollSlotHovered ? 'w-4' : 'w-2'}`,
          slotClassName
        ].join(' ')}
        ref={scrollSlotRef}
      >
        <div
          className={`ScrollDiv-scrollbar-thumb absolute right-0 w-full h-8 transition active:bg-opacity-100 hover:bg-opacity-80  ${
            isScrollContainerHovered ? 'bg-opacity-60' : 'bg-opacity-20'
          } bg-[#eee] ${thumbClassName}`}
          ref={scrollThumbRef}
          style={{
            top: 'clamp(0px, var(--scroll-top, 0) * var(--total-scroll, 0) * 1px, var(--total-scroll, 0) * 1px)'
          }}
        />
      </div>
      <div
        className="ScrollDiv-inner-content w-full h-full overflow-auto no-native-scrollbar"
        ref={scrollInnerContentRef}
      >
        {children}
      </div>
    </div>
  )
}
