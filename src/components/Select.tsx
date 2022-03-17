import useAppSettings from '@/application/appSettings/useAppSettings'
import { isString } from '@/functions/judgers/dateType'
import React, { useMemo } from 'react'
import { twMerge } from 'tailwind-merge'
import Col from './Col'
import Collapse from './Collapse'
import Icon from './Icon'
import Row from './Row'

/**
 * styled component
 */
export default function Select<T extends string>({
  className,
  candidateValues,
  defaultValue,
  prefix,
  onChange
}: {
  className?: string
  candidateValues: (T | { label: string; value: T })[]
  defaultValue?: string
  prefix?: string
  onChange?: (value: T | undefined /* emptify */) => void
}) {
  const [currentValue, setCurrentValue] = React.useState(defaultValue)
  const isMobile = useAppSettings((s) => s.isMobile)

  const parsedCandidates = useMemo(
    () => candidateValues.map((i) => (isString(i) ? { label: i, value: i } : i)),
    [candidateValues]
  )

  const currentLable = useMemo(
    () => parsedCandidates.find(({ value }) => value === currentValue)?.label,
    [currentValue, parsedCandidates]
  )

  const [isOpen, setIsOpen] = React.useState(false)

  const FaceCotent = ({ open = false }) => (
    <Row className="items-center w-full">
      <div className="mobile:text-xs text-base font-medium text-[rgba(196,214,255,.5)] mr-1 whitespace-nowrap">
        {prefix}
      </div>
      <div className="grow mobile:text-xs text-base font-medium text-[rgba(196,214,255)] whitespace-nowrap">
        {currentLable}
      </div>
      <Icon
        size={isMobile ? 'xs' : 'sm'}
        className="justify-self-end mr-1.5 text-[rgba(196,214,255,.5)] ml-2"
        heroIconName={`${open ? 'chevron-up' : 'chevron-down'}`}
      />
    </Row>
  )
  return (
    <div className={twMerge('relative', className)}>
      <div
        className={`py-2 px-6 mobile:px-3 ring-inset ring-1.5 ring-[rgba(196,214,255,0.5)] h-full rounded-xl mobile:rounded-xl invisible`}
      >
        <FaceCotent />
      </div>
      <Collapse
        className={`absolute z-10 top-0 left-0 ring-inset  ring-1.5 ring-[rgba(196,214,255,0.5)] rounded-xl mobile:rounded-xl w-full`}
        style={{
          background: isOpen
            ? 'linear-gradient(140.14deg, rgba(0, 182, 191, 0.15) 0%, rgba(27, 22, 89, 0.1) 86.61%), linear-gradient(321.82deg, #18134D 0%, #1B1659 100%)'
            : ''
        }}
        onClose={() => setIsOpen(false)}
        onOpen={() => setIsOpen(true)}
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
          {(open, controller) => (
            <Col className="border-t-1.5 border-[rgba(171,196,255,.1)] px-3 py-1">
              {candidateValues.map((candidate) => {
                const { label, value } =
                  typeof candidate === 'string' ? { label: candidate, value: candidate } : candidate
                return (
                  <Row
                    key={value}
                    className={`mobile:text-xs text-sm font-medium py-1.5 hover:text-[rgb(196,214,255)] text-[rgba(196,214,255,.5)] cursor-pointer ${
                      value === currentValue ? 'text-[rgba(196,214,255)]' : ''
                    } items-center`}
                    onClick={() => {
                      const parsedValue = value === currentValue ? undefined : value
                      setCurrentValue(parsedValue)
                      onChange?.(parsedValue)
                      controller.close()
                    }}
                  >
                    {label}
                    {value === currentValue && <Icon size="sm" heroIconName="check" className="ml-2" />}
                  </Row>
                )
              })}
            </Col>
          )}
        </Collapse.Body>
      </Collapse>
    </div>
  )
}
