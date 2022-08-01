import React, { startTransition, useEffect, useRef } from 'react'

import { twMerge } from 'tailwind-merge'

import IntervalCircle, { IntervalCircleHandler } from '@/components/IntervalCircle'
import Tooltip from '@/components/Tooltip'
import { useForceUpdate } from '@/hooks/useForceUpdate'
import useToggle from '@/hooks/useToggle'
import { AnyFn } from '@/types/constants'

import { useDocumentVisibility } from '../hooks/useDocumentVisibility'

import { PopoverPlacement } from './Popover'
import useAppSettings from '@/application/appSettings/useAppSettings'
import { inServer } from '@/functions/judgers/isSSR'
import { useIsomorphicLayoutEffect } from '@/hooks/useIsomorphicLayoutEffect '

const REFRESH_LOOP_DURATION = 60 * 1000

export default function RefreshCircle({
  run = true,
  refreshKey,
  popPlacement,
  forceOpen,
  freshFunction,
  freshDuration = 1000,
  className,
  circleBodyClassName
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
  freshDuration?: number
}) {
  useForceUpdate({ loop: freshDuration }) // update ui (refresh progress line)
  const intervalCircleRef = useRef<IntervalCircleHandler>()
  const { documentVisible } = useDocumentVisibility()
  const [needFresh, { on, off }] = useToggle()

  // for SSR can't maintain interval trully, so it just a fake
  const refreshCircleLastTimestamp = useAppSettings.getState().refreshCircleLastTimestamp[refreshKey]?.endTimestamp as
    | number
    | undefined
  const refreshCircleProcessPercent = useAppSettings.getState().refreshCircleLastTimestamp[refreshKey]
    ?.endProcessPercent as number | undefined
  const initPastPercent =
    refreshCircleLastTimestamp &&
    refreshCircleProcessPercent &&
    (Date.now() - refreshCircleLastTimestamp) / REFRESH_LOOP_DURATION + refreshCircleProcessPercent

  // should before <IntervalCircle> has destoryed, so have to useIsomorphicLayoutEffect
  useIsomorphicLayoutEffect(() => {
    if (inServer) return
    if (initPastPercent && initPastPercent > 1) {
      startTransition(() => {
        freshFunction?.()
      })
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
    if (needFresh && documentVisible) {
      startTransition(() => {
        freshFunction?.()
      })
      off()
    }
  }, [needFresh, freshFunction, documentVisible])

  return (
    <Tooltip className={className} placement={popPlacement} forceOpen={forceOpen}>
      <IntervalCircle
        run={run}
        initPercent={initPastPercent && initPastPercent % 1}
        duration={REFRESH_LOOP_DURATION}
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
          {Math.round(60 * (1 - (intervalCircleRef.current?.currentProgressPercent ?? 0)))} seconds. Click this circle
          to update manually.
        </div>
      </Tooltip.Panel>
    </Tooltip>
  )
}
