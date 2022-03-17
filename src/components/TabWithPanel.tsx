import React, { ComponentProps, ReactNode, useEffect, useMemo, useRef, useState } from 'react'

import addPropsToReactElement from '@/functions/react/addPropsToReactElement'
import { pickReactChildren } from '@/functions/react/pickChild'
import { shrinkToValue } from '@/functions/shrinkToValue'
import useBFlag from '@/hooks/useBFlag'

import RadioGroup, { RadioGroupProps } from './RadioGroup'

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface TabWithPanelProps<T extends string = string>
  extends Omit<RadioGroupProps<T>, 'className' | 'itemClassName'> {
  className?: string
  tabItemClassName?: string | ((checked: boolean) => string)
  tabGroupClassName?: string
  children?: ReactNode
}

/**
 * @example
 * findMinimun({12: hello, 23: world}) // => 'hello'
 *
 * @todo not flexiable enough
 *
 */
function findMinimum<K extends string | number>(obj: Record<string | number, K>): K {
  const min = Math.min(...Object.keys(obj).map(Number))
  return obj[min]
}

/**
 *
 * @example
 * <TabWithPanel values={['pool information', 'token information', 'tickets information']}>
 *   <TabWithPanel.Panel>111Pool Infofation</TabWithPanel.Panel>
 *   <TabWithPanel.Panel>222Toddken Infofation</TabWithPanel.Panel>
 *   <TabWithPanel.Panel>333Tickets Infofation</TabWithPanel.Panel>
 * </TabWithPanel>
 */
export default function TabWithPanel<T extends string = string>({
  values,
  className,
  children,
  tabItemClassName,
  tabGroupClassName,
  ...restProps
}: TabWithPanelProps<T>) {
  const [currentValue, setcurrentValue] = useState(values[0])
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const currentValueIndex = values.indexOf(currentValue)
    panelRef.current?.scrollTo({ left: currentValueIndex * panelRef.current.clientWidth, behavior: 'smooth' })
  }, [currentValue])

  const TabPanels = useMemo(
    () =>
      pickReactChildren(children, TabPanel, (el, idx) =>
        addPropsToReactElement<ComponentProps<typeof TabPanel>>(el, {
          key: el.key ?? el.props?.pkey /* for old data */ ?? idx,
          $isRenderByMain: true
        })
      ),
    [children]
  )
  /** assume there are only pointers and mouse wheel. so use onMouseWheel and onPointerDown  */
  const isMoveByCode = useBFlag()

  return (
    <div className={`Tab-with-panel text ${className ?? ''}`}>
      <RadioGroup
        values={values}
        className={`grid grid-cols-auto-fit ${tabGroupClassName ?? ''}`}
        itemClassName={(checked) =>
          `py-3 w-full text-center mobile:text-sm ${
            checked ? 'text-status-active font-bold' : ''
          } ${shrinkToValue(tabItemClassName, [checked])}`
        }
        currentValue={currentValue}
        {...restProps}
        onChange={(v) => {
          isMoveByCode.on()
          setcurrentValue(v)
        }}
      />
      <div
        ref={panelRef}
        className="panel-content flex overflow-x-scroll overflow-y-hidden no-scrollbar"
        style={{ scrollSnapType: 'x mandatory' }}
        onWheel={isMoveByCode.off}
        onPointerDown={isMoveByCode.off}
        onScroll={({ target }) => {
          if (isMoveByCode.value) return
          const currentScrollLeft = (target as HTMLDivElement).scrollLeft
          const differents = Object.fromEntries(
            values.map((value, idx) => [
              Math.abs(idx * (target as HTMLDivElement).clientWidth - currentScrollLeft),
              value
            ])
          )
          const nearistValue = findMinimum(differents)
          setcurrentValue(nearistValue)
        }}
      >
        {TabPanels}
      </div>
    </div>
  )
}

function TabPanel({
  className,
  children,
  $isRenderByMain
}: {
  $isRenderByMain?: boolean
  className?: string
  children: ReactNode
}) {
  if (!$isRenderByMain) return null
  return (
    <div className={`Tab-panel w-full flex-shrink-0 ${className ?? ''}`} style={{ scrollSnapAlign: 'start' }}>
      {children}
    </div>
  )
}

TabWithPanel.Panel = TabPanel
