import { useEffect, useLayoutEffect } from 'react'

import { twMerge } from 'tailwind-merge'

import toPercentString from '@/functions/format/toPercentString'
import { shrinkToValue } from '@/functions/shrinkToValue'
import { useIsomorphicLayoutEffect } from '@/hooks/useIsomorphicLayoutEffect '

import RadioGroup, { RadioGroupProps } from './RadioGroup'

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface TabProps<T extends string = string> extends RadioGroupProps<T> {
  affectUrlHash?: boolean
}

/**
 * Just inherit from `<StyledRadioGroup>` with ability to affect UrlHash
 * @returns
 */
export default function Tabs<T extends string = string>({ affectUrlHash, className, ...restProps }: TabProps<T>) {
  useIsomorphicLayoutEffect(() => {
    if (!affectUrlHash) return
    function onHashChange() {
      const currentHashName = window.location.hash.replace('#', '') as T
      restProps.onChange?.(currentHashName)
    }
    onHashChange() // affect url hash to props in init
    // change url hash to props if user change hash
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  useEffect(() => {
    if (!affectUrlHash) return
    if (restProps.currentValue) {
      // change url hash on props
      window.location.hash = `#${restProps.currentValue}`
    }
  }, [restProps.currentValue])

  return (
    <RadioGroup
      {...restProps}
      className={twMerge('rounded-full p-1', className)}
      style={{
        background:
          'linear-gradient(140.14deg, rgba(0, 182, 191, 0.15) 0%, rgba(27, 22, 89, 0.1) 86.61%), linear-gradient(321.82deg, #18134D 0%, #1B1659 100%)'
      }}
      itemClassName={(checked) =>
        twMerge(
          `grid min-w-[96px] mobile:min-w-[72px] px-4 h-9 mobile:h-7 rounded-full place-items-center text-sm mobile:text-xs font-medium ${
            checked ? 'text-white' : 'text-[#ABC4FF]'
          }`,
          shrinkToValue(restProps.itemClassName, [checked])
        )
      }
      itemStyle={(checked, idx, values) =>
        checked
          ? {
              background: 'linear-gradient(245.22deg, rgb(218, 46, 239), rgb(43, 106, 255), rgb(57, 208, 216))',
              backgroundSize: '400% 100%',
              backgroundPosition: toPercentString((1 / (values.length - 1)) * idx)
            }
          : {}
      }
    />
  )
}
