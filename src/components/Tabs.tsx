import { useEffect } from 'react'

import { twMerge } from 'tailwind-merge'

import toPercentString from '@/functions/format/toPercentString'
import { shrinkToValue } from '@/functions/shrinkToValue'
import { useIsomorphicLayoutEffect } from '@/hooks/useIsomorphicLayoutEffect '

import { addQuery, getURLQuery } from '@/functions/dom/getURLQueryEntries'
import RadioGroup, { RadioGroupProps } from './RadioGroup'

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface TabProps<T extends string = string> extends RadioGroupProps<T> {
  /** when set, means open affect url query search  */
  urlSearchQueryKey?: string
}

/**
 * Just inherit from `<StyledRadioGroup>` with ability to affect UrlHash
 * @returns
 */
export default function Tabs<T extends string = string>({ urlSearchQueryKey, className, ...restProps }: TabProps<T>) {
  useIsomorphicLayoutEffect(() => {
    // apply from url
    if (!urlSearchQueryKey) return
    const initTabValue = getURLQuery(urlSearchQueryKey) as T | undefined
    if (initTabValue && restProps.values.includes(initTabValue)) {
      restProps.onChange?.(initTabValue)
    }
  }, [])

  useEffect(() => {
    if (!urlSearchQueryKey) return
    if (restProps.currentValue) {
      addQuery(urlSearchQueryKey, restProps.currentValue)
    }
  }, [restProps.currentValue])

  return (
    <RadioGroup
      {...restProps}
      currentValue={restProps.currentValue}
      className={twMerge('rounded-full p-1 bg-cyberpunk-card-bg', className)}
      itemClassName={(checked) =>
        twMerge(
          `grid min-w-[96px] mobile:min-w-[72px] px-4 h-9 mobile:h-7 rounded-full place-items-center text-sm mobile:text-xs font-medium  whitespace-nowrap ${
            checked ? 'text-white' : 'text-[#ABC4FF]'
          }`,
          shrinkToValue(restProps.itemClassName, [checked])
        )
      }
      itemStyle={(checked, idx, values) =>
        checked
          ? {
              background: 'linear-gradient(245.22deg, rgb(218, 46, 239), rgb(43, 106, 255), rgb(57, 208, 216))',
              backgroundSize: `${values.length || 1}00% 100%`,
              backgroundPosition: toPercentString((1 / (values.length - 1)) * idx)
            }
          : {}
      }
    />
  )
}
