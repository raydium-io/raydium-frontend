import useAppSettings from '@/application/appSettings/useAppSettings'
import toPercentString from '@/functions/format/toPercentString'
import { shrinkToValue } from '@/functions/shrinkToValue'
import { useUrlQuery } from '@/hooks/useUrlQuery'
import { twMerge } from 'tailwind-merge'
import Collapse from './Collapse'
import Icon from './Icon'
import RadioGroup, { RadioGroupProps } from './RadioGroup'
import Row from './Row'

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface DropdownTabProps<T extends string = string> extends RadioGroupProps<T> {
  /** when set, means open affect url query search  */
  urlSearchQueryKey?: string
  /** only for <Tabs>  */
  $valuesLength?: number
}

/**
 * controlled component
 */
export default function DropdownTabs<T extends string>({
  $valuesLength,
  urlSearchQueryKey,
  className,
  ...restProps
}: DropdownTabProps<T>) {
  useUrlQuery<T>({
    currentValue: restProps.currentValue,
    values: restProps.values,
    onChange: restProps.onChange,
    queryKey: urlSearchQueryKey
  })

  const isMobile = useAppSettings((s) => s.isMobile)

  //#region ------------------- base on total value -------------------
  const isValueSelected = restProps.currentValue && restProps.values.includes(restProps.currentValue)
  const totalLength = $valuesLength ?? restProps.values.length
  const offsetStartIndex = $valuesLength ? $valuesLength - restProps.values.length : 0
  const currentValueIndex =
    (isValueSelected ? restProps.values.findIndex((v) => v === restProps.currentValue) : 0) + offsetStartIndex
  //#endregion

  const FaceContent = ({ open = false }) => (
    <div className="rounded-full p-1 bg-cyberpunk-card-bg">
      <Row
        className="items-center rounded-full w-full"
        style={
          isValueSelected
            ? {
                background: 'linear-gradient(245.22deg, rgb(218, 46, 239), rgb(43, 106, 255), rgb(57, 208, 216))',
                backgroundSize: `${totalLength}00% 100%`,
                backgroundPosition: toPercentString((1 / (totalLength - 1)) * currentValueIndex)
              }
            : {}
        }
      >
        <Row className="min-w-[104px] items-center justify-center mobile:min-w-[80px] h-9 mobile:h-7">
          <div
            className={`${
              isValueSelected ? 'text-white' : 'text-[#abc4ff]'
            } text-sm mobile:text-xs font-medium whitespace-nowrap`}
          >
            {isValueSelected ? restProps.currentValue : restProps.values[0]}
          </div>
        </Row>
        <Icon
          size={isMobile ? 'xs' : 'sm'}
          className="justify-self-end mr-1.5 text-[rgba(196,214,255,.5)]"
          heroIconName={`${open ? 'chevron-up' : 'chevron-down'}`}
        />
      </Row>
    </div>
  )

  return (
    <div className={twMerge('relative', className)}>
      <div className={`invisible`}>
        <FaceContent />
      </div>
      <Collapse className={`absolute z-dropdown top-0 left-0 w-full`} closeByOutsideClick>
        <Collapse.Face>{(open) => <FaceContent open={open} />}</Collapse.Face>
        <Collapse.Body>
          <RadioGroup
            {...restProps}
            vertical
            currentValue={restProps.currentValue}
            className={twMerge(
              'border-t-1.5 border-[#abc4ff50] divide-y divide-[#abc4ff33] bg-cyberpunk-card-bg',
              className
            )}
            itemClassName={(checked) =>
              twMerge(
                `my-3 px-3  text-sm font-medium whitespace-nowrap ${checked ? 'text-white' : 'text-[#ABC4FF]'}`,
                shrinkToValue(restProps.itemClassName, [checked])
              )
            }
          />
        </Collapse.Body>
      </Collapse>
    </div>
  )
}
