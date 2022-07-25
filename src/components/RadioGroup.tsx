import { CSSProperties, ReactNode } from 'react'
import { twMerge } from 'tailwind-merge'

import { shrinkToValue } from '@/functions/shrinkToValue'
import { RadioGroup as _RadioGroup } from '@headlessui/react'
import { MayFunction } from '@/types/constants'

export interface RadioGroupProps<T extends string> {
  className?: string
  style?: CSSProperties
  // TODO: itemClassName\itemStyle\value\label should be merged into a obj
  // flex/flex-col
  vertical?: boolean
  // /** @deprecated use props:items instead */
  itemClassName?: string | ((checked: boolean) => string)
  // /** @deprecated use props:items instead */
  itemStyle?: CSSProperties | ((checked: boolean, itemIndex: number, values: readonly T[]) => CSSProperties)
  currentValue?: T
  // /** @deprecated use props:items instead */
  values: readonly T[]
  // /** @deprecated use props:items instead */
  labels?: readonly MayFunction<ReactNode, [checked: boolean, itemIndex: number, values: readonly T[]]>[]
  // items: {
  //   className?: MayFunction<string, [checked: boolean]>
  //   style?: MayFunction<CSSProperties, [check: boolean,  itemIndex: number, values: readonly T[]]>
  //   value:  T
  //   label?: MayFunction<ReactNode, [checked:boolean, itemIndex:number, value]
  // }[]
  /** this callback may be invoke in init if user input URL has a hash   */
  onChange?: (currentValue: T) => any
}

/** everything changed by `<TabSwitcher>` may affect  hash  */
export default function RadioGroup<T extends string>({
  className,
  style,
  vertical,
  itemClassName,
  itemStyle,
  values,
  currentValue = values[0],
  labels = values, // it will not update when values changed
  onChange
}: RadioGroupProps<T>): JSX.Element {
  if (!values.filter(Boolean).length) return <></>

  return (
    <_RadioGroup
      value={currentValue}
      onChange={onChange ?? (() => {})}
      className={twMerge(`${vertical ? 'flex-col' : 'flex'} ${className ?? ''}`)}
      style={style}
    >
      {values.map((value, idx, vals) => (
        <_RadioGroup.Option value={value} key={idx} className={`cursor-pointer flex grow`}>
          {({ checked }) =>
            value && (
              <div
                className={`grid grow ${vertical ? '' : 'place-items-center'} ${shrinkToValue(itemClassName, [
                  checked
                ])}`}
                style={shrinkToValue(itemStyle, [checked, idx, vals])}
              >
                {shrinkToValue(labels[idx], [checked, idx, vals])}
              </div>
            )
          }
        </_RadioGroup.Option>
      ))}
    </_RadioGroup>
  )
}
