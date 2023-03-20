import React, { startTransition, useEffect, useRef } from 'react'

import { twMerge } from 'tailwind-merge'

import useAppSettings from '@/application/common/useAppSettings'
import IntervalCircle, { IntervalCircleHandler } from '@/components/IntervalCircle'
import Tooltip from '@/components/Tooltip'
import { inServer } from '@/functions/judgers/isSSR'
import { useForceUpdate } from '@/hooks/useForceUpdate'
import { useIsomorphicLayoutEffect } from '@/hooks/useIsomorphicLayoutEffect '
import { useSignalState } from '@/hooks/useSignalState'
import { AnyFn } from '@/types/constants'

import { useDocumentVisibility } from '../hooks/useDocumentVisibility'

import { PopoverPlacement } from './Popover'

const REFRESH_LOOP_DURATION = 60 * 1000

export default function RefreshCircle({
  run = true,
  refreshKey,
  popPlacement,
  forceOpen,
  freshFunction,
  freshEach = 1000,
  totalDuration = REFRESH_LOOP_DURATION,
  className,
  circleBodyClassName,
  disabled = false
}: {
  /** like animation run */
  run?: boolean
  // to record state in useAppSettings
  refreshKey: string
  className?: string
  forceOpen?: boolean
  circleBodyClassName?: string
  popPlacement?: PopoverPlacement
  freshFunction?: AnyFn
  freshEach?: number
  totalDuration?: number
  disabled?: boolean
}) {
  useForceUpdate({ loop: freshEach }) // update ui (refresh progress line)
  const intervalCircleRef = useRef<IntervalCircleHandler>()
  const { documentVisible } = useDocumentVisibility()
  const [needFresh, setNeedFresh, needFreshSignal] = useSignalState(false)
  const on = () => setNeedFresh(true)
  const off = () => setNeedFresh(false)
  const isMobile = useAppSettings((s) => s.isMobile)

  // for SSR can't maintain interval trully, so it just a fake
  const refreshCircleLastTimestamp = useAppSettings.getState().refreshCircleLastTimestamp[refreshKey]?.endTimestamp as
    | number
    | undefined
  const refreshCircleProcessPercent = useAppSettings.getState().refreshCircleLastTimestamp[refreshKey]
    ?.endProcessPercent as number | undefined
  const initPastPercent =
    refreshCircleLastTimestamp &&
    refreshCircleProcessPercent &&
    (Date.now() - refreshCircleLastTimestamp) / totalDuration + refreshCircleProcessPercent

  // should before <IntervalCircle> has destoryed, so have to useIsomorphicLayoutEffect
  useIsomorphicLayoutEffect(() => {
    if (inServer) return
    if (initPastPercent && initPastPercent > 1) {
      freshFunction?.()
    }
    return () => {
      useAppSettings.setState((s) => ({
        refreshCircleLastTimestamp: {
          ...s.refreshCircleLastTimestamp,
          [refreshKey]: {
            endTimestamp: Date.now(),
            endProcessPercent: intervalCircleRef.current?.currentProgressPercent ?? 0
          }
        }
      }))
    }
  }, [])

  useEffect(() => {
    if (disabled) return
    if (!needFreshSignal()) return
    if (!documentVisible) return
    const timoutId = setTimeout(() => {
      freshFunction?.()
      off()
    }, 100)
    return () => clearTimeout(timoutId)
  }, [needFresh, documentVisible, disabled])

  return (
    <Tooltip
      className={twMerge('select-none', className)}
      placement={popPlacement}
      forceOpen={forceOpen}
      triggerBy={isMobile ? 'press' : undefined}
      autoClose
    >
      <IntervalCircle
        run={run && !disabled}
        initPercent={initPastPercent && initPastPercent % 1}
        duration={totalDuration}
        componentRef={intervalCircleRef}
        className={twMerge('clickable clickable-filter-effect', circleBodyClassName)}
        onClick={() => {
          on()
          intervalCircleRef.current?.restart()
        }}
        onEnd={() => {
          on()
          intervalCircleRef.current?.restart()
        }}
      />
      <Tooltip.Panel>
        <div className="w-60">
          Displayed data will auto-refresh after{' '}
          {Math.round((totalDuration / 1000) * (1 - (intervalCircleRef.current?.currentProgressPercent ?? 0)))} seconds.
          Click this circle to update manually.
        </div>
      </Tooltip.Panel>
    </Tooltip>
  )
}
