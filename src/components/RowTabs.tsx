import toPercentString from '@/functions/format/toPercentString'
import { shrinkToValue } from '@/functions/shrinkToValue'
import { twMerge } from 'tailwind-merge'
import { useUrlQuery } from '../hooks/useUrlQuery'
import RadioGroup, { RadioGroupProps } from './RadioGroup'

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface RowTabProps<T extends string = string> extends RadioGroupProps<T> {
  /** when set, means open affect url query search  */
  urlSearchQueryKey?: string
  /** only for <Tabs>  */
  $valuesLength?: number
  /** only for <Tabs>  */
  $transparentBg?: boolean
  size?: 'md' | 'sm'
}

/**
 * controlled component
 * Just inherit from `<StyledRadioGroup>` with ability to affect UrlHash
 * @returns
 */
export default function RowTabs<T extends string = string>({
  size,
  $valuesLength,
  $transparentBg,
  urlSearchQueryKey,
  className,
  ...restProps
}: RowTabProps<T>) {
  useUrlQuery<T>({
    currentValue: restProps.currentValue,
    values: restProps.values,
    onChange: restProps.onChange,
    queryKey: urlSearchQueryKey
  })

  //#region ------------------- base on total value -------------------
  const isValueSelected = restProps.currentValue && restProps.values.includes(restProps.currentValue)
  const totalLength = $valuesLength ?? restProps.values.length
  const offsetStartIndex = 0
  const currentValueIndex =
    (isValueSelected ? restProps.values.findIndex((v) => v === restProps.currentValue) : 0) + offsetStartIndex
  //#endregion

  return (
    <RadioGroup
      {...restProps}
      currentValue={restProps.currentValue}
      className={twMerge('rounded-full p-1', $transparentBg ? 'bg-transparent' : 'bg-cyberpunk-card-bg', className)}
      itemClassName={(checked) =>
        twMerge(
          size === 'sm'
            ? 'min-w-[82px] mobile:min-w-[64px] px-2 mobile:px-1.5 h-7 mobile:h-5 text-sm mobile:text-xs'
            : 'min-w-[96px] mobile:min-w-[76px] px-3 mobile:px-2 h-9 mobile:h-7 text-sm mobile:text-xs ',
          `grid rounded-full place-items-center font-medium whitespace-nowrap ${
            checked ? 'text-white' : 'text-[#ABC4FF]'
          }`,
          shrinkToValue(restProps.itemClassName, [checked])
        )
      }
      itemStyle={(checked) =>
        checked
          ? {
              background: 'linear-gradient(245.22deg, rgb(218, 46, 239), rgb(43, 106, 255), rgb(57, 208, 216))',
              backgroundSize: `${totalLength}00% 100%`,
              backgroundPosition: toPercentString((1 / (totalLength - 1)) * currentValueIndex)
            }
          : {}
      }
    />
  )
}
