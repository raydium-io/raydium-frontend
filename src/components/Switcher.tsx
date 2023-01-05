import { CSSProperties, RefObject, useEffect, useState } from 'react'
import { twMerge } from 'tailwind-merge'

import { Switch as Swi } from '@headlessui/react'

/**
 * @baseUI
 */
export default function Switcher({
  defaultChecked,
  checked,
  disable,
  domRef,
  className = '',
  thumbClassName = '',
  style,
  onToggle
}: {
  defaultChecked?: boolean
  checked?: boolean
  disable?: boolean
  domRef?: RefObject<HTMLButtonElement>
  className?: string
  thumbClassName?: string
  style?: CSSProperties
  onToggle?: (checked: boolean) => void
}) {
  const [isChecked, setIsChecked] = useState(Boolean(defaultChecked ?? checked))
  useEffect(() => {
    if (checked != null) setIsChecked(checked)
  }, [checked])
  return (
    <Swi
      ref={domRef}
      checked={isChecked}
      onChange={
        ((checked) => {
          if (disable) return
          setIsChecked((b) => !b)
          onToggle?.(checked)
        }) ?? (() => {})
      }
      className={twMerge(
        `Switch ${
          isChecked ? (disable ? 'bg-[#7ba4a7]' : 'bg-[#39D0D8]') : 'bg-[#1B1659]'
        } relative flex flex-shrink-0 h-5 w-10 border-2 border-transparent rounded-full ${
          disable ? 'cursor-not-allowed opacity-20' : 'cursor-pointer'
        } transition-all ease-in-out duration-200 focus:outline-none`,
        className
      )}
      style={style}
    >
      <span
        className={`${isChecked ? 'left-full -translate-x-full' : 'left-0'}
            pointer-events-none absolute top-1/2 h-4 w-4  rounded-full ${
              isChecked ? 'bg-white' : 'bg-[rgba(171,196,255,0.5)]'
            } shadow-lg transform -translate-y-1/2 transition-all duration-200 ${thumbClassName}`}
      />
    </Swi>
  )
}

// TODO: dev it!
// export function UncontolledSwitcher(props: ComponentProps<typeof Switcher>){
//   return null
// }
