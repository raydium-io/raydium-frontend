import React, { CSSProperties, ReactNode, useCallback, useEffect, useMemo } from 'react'

import createContextStore from '@/functions/react/createContextStore'
import { shrinkToValue } from '@/functions/shrinkToValue'
import { MayFunction } from '@/types/constants'

import Drawer from './Drawer'

const { ContextProvider, useStore, useSetters } = createContextStore<{
  isDrawerContentShown: boolean
  position: 'from-left' | 'from-bottom' | 'from-right' | 'from-top'
  /** user callbacks */
  onOpen?: () => void
  onClose?: () => void
  canOpen?: boolean
}>({ canOpen: true, isDrawerContentShown: false, position: 'from-left' }, { debugName: 'DrawerMethodsContext' })

export type DrawerPlacement = 'from-left' | 'from-bottom'

function _Drawer({
  children,
  placement,
  onOpen,
  onClose,
  canOpen
}: {
  children?: MayFunction<ReactNode, [{ open(): void; close(): void; toggle(): void }]>
  onOpen?: () => void
  onClose?: () => void
  // just render it's children , when not active
  placement?: DrawerPlacement
  canOpen?: boolean
}) {
  const { setPosition, setIsDrawerContentShown, setOnOpen, setOnClose, setCanOpen } = useSetters()

  const open = useCallback(() => setIsDrawerContentShown(true), [])
  const close = useCallback(() => setIsDrawerContentShown(false), [])
  const toggle = useCallback(() => setIsDrawerContentShown((b) => !b), [])
  useEffect(() => {
    if (placement != null) setPosition(placement)
  }, [placement])
  useEffect(() => {
    setOnOpen(() => onOpen)
  }, [onOpen])
  useEffect(() => {
    setOnClose(() => onClose)
  }, [onClose])
  useEffect(() => {
    if (canOpen != null) setCanOpen(canOpen)
  }, [canOpen])

  return <>{useMemo(() => shrinkToValue(children, [{ open, close, toggle }]), [children])}</>
}

// just register <Provider> and access managed components
/** <Drawer>, but headless-ui trigger mode  */
export default function HDrawer(props: Parameters<typeof _Drawer>[0]) {
  return (
    <ContextProvider>
      <_Drawer {...props} />
    </ContextProvider>
  )
}

HDrawer.Panel = DrawerPanel
HDrawer.Button = DrawerButton

export function DrawerButton({
  children
}: {
  children?: MayFunction<ReactNode, [{ open(): void; close(): void; toggle(): void }]>
}) {
  const { setIsDrawerContentShown } = useSetters()
  const openPanel = useCallback(() => setIsDrawerContentShown(true), [setIsDrawerContentShown])
  const closePanel = useCallback(() => setIsDrawerContentShown(false), [setIsDrawerContentShown])
  const togglePanel = useCallback(() => setIsDrawerContentShown((b) => !b), [setIsDrawerContentShown])
  return (
    <div onClick={openPanel}>
      {shrinkToValue(children, [{ open: openPanel, close: closePanel, toggle: togglePanel }])}
    </div>
  )
}

export function DrawerPanel({
  className,
  style,
  children
}: {
  className?: string
  style?: CSSProperties
  children?: MayFunction<ReactNode, [{ open(): void; close(): void; toggle(): void }]>
}) {
  const { setIsDrawerContentShown, isDrawerContentShown: isOpen, position, onOpen, onClose, canOpen } = useStore()
  const openPanel = useCallback(() => setIsDrawerContentShown(true), [setIsDrawerContentShown])
  const closePanel = useCallback(() => setIsDrawerContentShown(false), [setIsDrawerContentShown])
  const togglePanel = useCallback(() => setIsDrawerContentShown((b) => !b), [setIsDrawerContentShown])
  return (
    <Drawer
      className={className}
      open={Boolean(canOpen && isOpen)}
      onClose={() => {
        closePanel()
        onClose?.()
      }}
      onOpen={() => {
        openPanel()
        onOpen?.()
      }}
      placement={position}
      style={style}
    >
      {shrinkToValue(children, [{ open: openPanel, close: closePanel, toggle: togglePanel }])}
    </Drawer>
  )
}
