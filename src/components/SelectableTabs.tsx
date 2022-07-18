import useAppSettings from '@/application/appSettings/useAppSettings'
import { shrinkToValue } from '@/functions/shrinkToValue'
import { useUrlQuery } from '@/hooks/useUrlQuery'
import { ReactNode } from 'react'
import { twMerge } from 'tailwind-merge'
import Col from './Col'
import Collapse from './Collapse'
import Icon from './Icon'
import RadioGroup, { RadioGroupProps } from './RadioGroup'
import Row from './Row'

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface SelectableTabProps<T extends string = string> extends RadioGroupProps<T> {
  title?: ReactNode
  /** when set, means open affect url query search  */
  urlSearchQueryKey?: string
}

/**
 * controlled component
 */
export default function SelectableTabs<T extends string>({
  title,
  urlSearchQueryKey,
  className,
  ...restProps
}: SelectableTabProps<T>) {
  useUrlQuery<T>({
    currentValue: restProps.currentValue,
    values: restProps.values,
    onChange: restProps.onChange,
    queryKey: urlSearchQueryKey
  })

  const isMobile = useAppSettings((s) => s.isMobile)

  const FaceCotent = ({ open = false }) => (
    <Row className="items-center w-full">
      <Col className="min-w-[40vw]">
        <div className="mobile:text-xs text-sm font-medium text-[#abc4ff80] mr-1 whitespace-nowrap">{title}</div>
        <div className="grow text-sm font-medium text-[#ffffff] whitespace-nowrap">{restProps.currentValue}</div>
      </Col>
      <Icon
        size={isMobile ? 'xs' : 'sm'}
        className="justify-self-end mr-1.5 text-[rgba(196,214,255,.5)] ml-2"
        heroIconName={`${open ? 'chevron-up' : 'chevron-down'}`}
      />
    </Row>
  )

  return (
    <div className={twMerge('relative', className)}>
      <div className={`py-2 px-6 mobile:px-3  h-full rounded-lg invisible`}>
        <FaceCotent />
      </div>
      <Collapse
        className={`absolute z-dropdown top-0 left-0 overflow-hidden rounded-lg w-full bg-cyberpunk-card-bg`}
        closeByOutsideClick
      >
        <Collapse.Face>
          {(open) => (
            <div className="py-2 px-6 mobile:px-3 ">
              <FaceCotent open={open} />
            </div>
          )}
        </Collapse.Face>
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
