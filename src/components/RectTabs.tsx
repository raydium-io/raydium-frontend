import { MouseEvent, ReactNode, useCallback } from 'react'

import { twMerge } from 'tailwind-merge'

export interface TabItem {
  name: ReactNode
  className?: string
  value: string | number
}

interface Props {
  classNames?: string
  tabs: TabItem[]
  selected?: string | number
  onChange?: (tab: TabItem) => void
}

//active-tab-bg

export default function RectTabs(props: Props) {
  const { classNames, tabs, selected, onChange } = props

  const handleChange = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      onChange?.(tabs.find((tab) => tab.value === e.currentTarget.dataset['val'])!)
    },
    [onChange, tabs]
  )

  return (
    <div className={twMerge(classNames, 'flex rounded-lg p-1 bg-dark-blue')}>
      {tabs.map((tab) => {
        const isSelected = selected === tab.value
        return (
          <div
            key={tab.value}
            onClick={isSelected ? undefined : handleChange}
            data-val={tab.value}
            className={twMerge(
              `flex text-xs ${
                isSelected ? 'bg-active-tab-bg text-active-cyan cursor-default' : 'cursor-pointer text-white/40'
              }`,
              tab.className
            )}
          >
            <div className="py-1 px-2.5">{tab.name}</div>
          </div>
        )
      })}
    </div>
  )
}
