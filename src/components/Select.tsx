import useAppSettings from '@/application/appSettings/useAppSettings'
import { isString } from '@/functions/judgers/dateType'
import useLocalStorageItem from '@/hooks/useLocalStorage'
import React, { ReactNode, useEffect, useMemo, useState } from 'react'
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
  localStorageKey,
  onChange
}: {
  className?: string
  candidateValues: (T | { label: string; value: T })[]
  defaultValue?: T
  prefix?: ReactNode
  /** stable props */
  localStorageKey?: string
  onChange?: (value: T | undefined /* emptify */) => void
}) {
  const parsedCandidates = useMemo(
    () => candidateValues.map((i) => (isString(i) ? { label: i, value: i } : i)),
    [candidateValues]
  )

  const parsedCandidateValues = parsedCandidates.map(({ value }) => value)

  const [currentValue, setCurrentValue] = localStorageKey
    ? useLocalStorageItem(localStorageKey, {
        defaultValue,
        validateFn: (v) => Boolean(v) && parsedCandidateValues.includes(v!)
      })
    : useState(defaultValue)

  const isMobile = useAppSettings((s) => s.isMobile)

  useEffect(() => {
    onChange?.(currentValue)
  }, [currentValue])

  const currentLable = useMemo(
    () => parsedCandidates.find(({ value }) => value === currentValue)?.label,
    [currentValue, parsedCandidates]
  )

  const [isOpen, setIsOpen] = React.useState(false)

  const FaceCotent = ({ open = false }) => (
    <Row className="items-center w-full">
      <div className="mobile:text-xs text-sm font-medium text-[rgba(196,214,255,.5)] mr-1 whitespace-nowrap">
        {prefix}
      </div>
      <div className="grow mobile:text-xs text-sm font-medium text-[rgba(196,214,255)] whitespace-nowrap">
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
        className={`absolute z-10 top-0 left-0 ring-inset ring-1.5 ring-[rgba(196,214,255,0.5)] rounded-xl mobile:rounded-xl w-full ${
          isOpen ? 'bg-cyberpunk-card-bg' : ''
        }`}
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
                      if (parsedValue) {
                        setCurrentValue(parsedValue)
                        controller.close()
                      }
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
