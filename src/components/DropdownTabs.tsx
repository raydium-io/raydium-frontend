import useAppSettings from '@/application/common/useAppSettings'
import toPercentString from '@/functions/format/toPercentString'
import { shrinkToValue } from '@/functions/shrinkToValue'
import { useUrlQuery } from '@/hooks/useUrlQuery'
import { useRef, useState } from 'react'
import { twMerge } from 'tailwind-merge'
import Collapse, { CollapseHandler } from './Collapse'
import Icon from './Icon'
import RadioGroup, { RadioGroupProps } from './RadioGroup'
import Row from './Row'

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface DropdownTabProps<T extends string = string> extends RadioGroupProps<T> {
  /** when set, means open affect url query search  */
  urlSearchQueryKey?: string
  /** only for <Tabs>  */
  $valuesLength?: number
  /** only for <Tabs>  */
  $transparentBg?: boolean
}

/**
 * controlled component
 */
export default function DropdownTabs<T extends string>({
  $valuesLength,
  $transparentBg,
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

  const [collapseFaceValue, setCollapseFaceValue] = useState(() =>
    isValueSelected ? restProps.currentValue! : restProps.values[0]
  )

  const collapseRef = useRef<CollapseHandler>(null)

  const FaceContent = ({
    open = false,
    onClickIcon,
    onClickFace
  }: {
    open?: boolean
    onClickIcon?: () => void
    onClickFace?: () => void
  }) => (
    <div
      className={`rounded-[22px] mobile:rounded-[18px] p-1 ${
        ($transparentBg && !open) || open ? 'bg-transparent' : 'bg-cyberpunk-card-bg'
      }`}
    >
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
        <Row className="min-w-[120px] items-stretch justify-between mobile:min-w-[108px] h-9 mobile:h-7">
          <Row
            onClick={onClickFace}
            className={`grow-2 justify-center items-center ${
              isValueSelected ? 'text-white' : 'text-[#abc4ff]'
            } text-sm mobile:text-xs font-medium whitespace-nowrap active:backdrop-brightness-90`}
          >
            {collapseFaceValue}
          </Row>

          {/* short line */}
          <div className="border-r border-[#abc4ff80] my-2 self-stretch"></div>
          <Row onClick={onClickIcon} className="grow justify-center items-center active:backdrop-brightness-90">
            <Icon
              size={isMobile ? 'xs' : 'sm'}
              className="text-[rgba(196,214,255,.5)]"
              heroIconName={`${open ? 'chevron-up' : 'chevron-down'}`}
            />
          </Row>
        </Row>
      </Row>
    </div>
  )

  return (
    <div className={twMerge('relative', className)}>
      <div className={`invisible`}>
        <FaceContent />
      </div>
      <Collapse
        componentRef={collapseRef}
        className={(open) =>
          `absolute z-dropdown top-0 left-0 w-full ${
            open ? 'bg-cyberpunk-card-bg' : 'bg-transparent'
          } rounded-[22px] mobile:rounded-[18px]`
        }
        closeByOutsideClick
        disableOpenByClickFace
      >
        <Collapse.Face>
          {(open) => (
            <FaceContent
              open={open}
              onClickIcon={() => {
                collapseRef.current?.toggle()
              }}
              onClickFace={() => {
                restProps.onChange?.(collapseFaceValue)
              }}
            />
          )}
        </Collapse.Face>
        <Collapse.Body>
          <RadioGroup
            {...restProps}
            vertical
            currentValue={restProps.currentValue}
            itemClassName={(checked) =>
              twMerge(
                `my-3 px-3 text-sm mobile:text-xs font-medium whitespace-nowrap ${
                  checked ? 'text-white' : 'text-[#ABC4FF]'
                }`,
                shrinkToValue(restProps.itemClassName, [checked])
              )
            }
            onChange={(value) => {
              setCollapseFaceValue(value)
              restProps.onChange?.(value)
              collapseRef.current?.close()
            }}
          />
        </Collapse.Body>
      </Collapse>
    </div>
  )
}
