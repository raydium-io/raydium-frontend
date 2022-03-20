import { RefObject, useCallback, useEffect, useState } from 'react'

import { getScrollParents } from '../../functions/dom/getScrollParents'
import { PopoverPlacement } from './index'

export type PopupLocationInfo = {
  // reltive to screen
  panelLeft: number
  panelTop: number
  // reltive to screen. arrow bottom center
  arrowLeftRelativeToPanel: number
  arrowTopRelativeToPanel: number
}

/**
 * ASK: What's the difference from <Tooltip>?
 * ANS: 1. <Tooltip> is just a sigle wrapper, but <Popover> is more  complex
 * 2. <Tooltip> should just show some infomation, but <Popover>'s content can interactive
 */
const POPOVER_GAP = 8
const POPOVER_VIEWPORT_BOUNDARY_INSET = 6

const calcPopupPanelLocation = ({
  buttonElement,
  panelElement,
  placement,
  cornerOffset = 0,
  popoverGap = POPOVER_GAP,
  viewportBoundaryInset = POPOVER_VIEWPORT_BOUNDARY_INSET
}: {
  buttonElement: HTMLDivElement
  panelElement: HTMLDivElement
  placement: PopoverPlacement

  /** for corner placement like 'top-left' 'top-right etc. */
  cornerOffset?: number
  /** gap between `<PopoverButton>` and `<PopoverPanel>`*/
  popoverGap?: number
  /** to leave some space when touch the viewport boundary */
  viewportBoundaryInset?: number
}): PopupLocationInfo | undefined => {
  // must in some computer
  if (!globalThis.document) return undefined
  const panelWidth = panelElement.clientWidth
  const panelHeight = panelElement.clientHeight

  const viewportWidth = globalThis.document.documentElement.clientWidth - viewportBoundaryInset * 2
  const viewportHeight = globalThis.document.documentElement.clientHeight - viewportBoundaryInset * 2
  const viewportTop = viewportBoundaryInset
  const viewportLeft = viewportBoundaryInset
  const viewportRight = viewportLeft + viewportWidth
  const viewportBottom = viewportTop + viewportHeight

  const {
    left: buttonLeft,
    top: buttonTop,
    right: buttonRight,
    bottom: buttonBottom,
    width: buttonWidth,
    height: buttonHeight
  } = buttonElement.getBoundingClientRect()
  const buttonCenterX = buttonLeft + buttonWidth / 2
  const buttonCenterY = buttonTop + buttonHeight / 2

  const calcPanel = (placement: PopoverPlacement): [left: number, top: number] | undefined => {
    const rules: Record<PopoverPlacement, () => [panelLeft: number, panelTop: number]> = {
      left: () => [buttonLeft - popoverGap - panelWidth, buttonCenterY - panelHeight / 2],
      'left-top': () => [buttonLeft - popoverGap - panelWidth, buttonTop - cornerOffset],
      'left-bottom': () => [buttonLeft - popoverGap - panelWidth, buttonBottom - panelHeight + cornerOffset],
      right: () => [buttonRight + popoverGap, buttonCenterY - panelHeight / 2],
      'right-top': () => [buttonRight + popoverGap, buttonTop - cornerOffset],
      'right-bottom': () => [buttonRight + popoverGap, buttonBottom - panelHeight + cornerOffset],
      top: () => [buttonCenterX - panelWidth / 2, buttonTop - popoverGap - panelHeight],
      'top-left': () => [buttonLeft - cornerOffset, buttonTop - popoverGap - panelHeight],
      'top-right': () => [buttonRight - panelWidth + cornerOffset, buttonTop - popoverGap - panelHeight],
      bottom: () => [buttonCenterX - panelWidth / 2, buttonBottom + popoverGap],
      'bottom-left': () => [buttonLeft - cornerOffset, buttonBottom + popoverGap],
      'bottom-right': () => [buttonRight - panelWidth + cornerOffset, buttonBottom + popoverGap]
    }
    return rules[placement]?.()
  }
  // calc panel
  const [theoreticallyPanelLeft, theoreticallyPanelTop] = calcPanel(placement) ?? [0, 0]
  const theoreticallyPanelBottom = theoreticallyPanelTop + panelHeight
  const theoreticallyPanelRight = theoreticallyPanelLeft + panelWidth

  const idealPanelOffsetY =
    theoreticallyPanelBottom > viewportBottom
      ? viewportBottom - theoreticallyPanelBottom
      : theoreticallyPanelTop < viewportTop
      ? viewportTop - theoreticallyPanelTop
      : 0

  const idealPanelOffsetX =
    theoreticallyPanelRight > viewportRight
      ? viewportRight - theoreticallyPanelRight
      : theoreticallyPanelLeft < viewportLeft
      ? viewportLeft - theoreticallyPanelLeft
      : 0

  const panelLeft = theoreticallyPanelLeft + idealPanelOffsetX
  const panelTop = theoreticallyPanelTop + idealPanelOffsetY

  // calc arrow
  const arrowTop = clamp(buttonCenterY, { min: panelTop, max: panelTop + panelHeight }) - panelTop
  const arrowLeft = clamp(buttonCenterX, { min: panelLeft, max: panelLeft + panelWidth }) - panelLeft

  return {
    panelLeft: panelLeft,
    panelTop: panelTop,
    arrowLeftRelativeToPanel: arrowLeft,
    arrowTopRelativeToPanel: arrowTop
  }
}
const clamp = (current: number, payload: { min: number; max: number }) =>
  Math.max(payload.min, Math.min(payload.max, current))

export function usePopoverLocation(
  buttonRef: RefObject<HTMLDivElement>,
  panelRef: RefObject<HTMLDivElement>,
  options: {
    placement: PopoverPlacement

    /** for corner placement like 'top-left' 'top-right etc. */
    cornerOffset?: number
    /** gap between `<PopoverButton>` and `<PopoverPanel>`*/
    popoverGap?: number
    /** to leave some space when touch the viewport boundary */
    viewportBoundaryInset?: number
  }
): { locationInfo: PopupLocationInfo | undefined; updateLocation: () => void } {
  const [panelCoordinates, setPanelCoordinates] = useState<PopupLocationInfo>()

  const update = useCallback(() => {
    // must in some computer
    if (!globalThis.document) return
    if (!buttonRef.current || !panelRef.current) return

    setPanelCoordinates(
      calcPopupPanelLocation({
        buttonElement: buttonRef.current,
        panelElement: panelRef.current,
        ...options
      })
    )
  }, [])

  useEffect(() => {
    if (!buttonRef) return
    if (!panelRef) return
    const buttonScrollParents = buttonRef.current ? getScrollParents(buttonRef.current) : []
    const panelScrollParents = panelRef.current ? getScrollParents(panelRef.current) : []
    const parents = [...buttonScrollParents, ...panelScrollParents]
    parents.forEach((parent) => {
      parent.addEventListener('scroll', update, { passive: true })
      globalThis.addEventListener?.('resize', update, { passive: true })
    })
    return () => {
      parents.forEach((parent) => {
        parent.removeEventListener('scroll', update)
        globalThis.removeEventListener?.('resize', update)
      })
    }
  }, [buttonRef, panelRef])

  return { locationInfo: panelCoordinates, updateLocation: update }
}
