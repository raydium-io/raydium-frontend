/**
 * depends on <List>
 */

import { isObject, isString } from '@/functions/judgers/dateType'
import { shrinkToValue } from '@/functions/shrinkToValue'
import { MayArray, MayFunction } from '@/types/constants'
import { SKeyof } from '@/types/generics'
import { useState, useMemo, useEffect, ReactNode, Fragment, useRef } from 'react'
import Card from './Card'
import Col from './Col'
import Row from './Row'

export function useList<T>(
  arr: T[],
  onListChange?: (newlist: T[]) => void,
  options?: {
    searchText?: string // TODO: imply it!!!
  }
): { wrapped: { data: T; destory(): void; changeSelf(newItem: T): void }[]; controls: { clear(): void } } {
  const [dataList, setDataList] = useState(arr)
  const [searchText, setSearchText] = useState(options?.searchText) // TODO: imply it!!!

  useEffect(() => {
    if (dataList === arr) return
    onListChange?.(dataList)
  }, [dataList])

  const wrapped = useMemo(
    () =>
      dataList.map((item, idx) => ({
        data: item,
        destory: () => {
          setDataList((prev) => prev.filter((dataItem, dataIndex) => dataIndex !== idx))
        },
        changeSelf: (newItem) => {
          setDataList((prev) => prev.map((dataItem, dataIndex) => (dataIndex === idx ? newItem : dataItem)))
        }
      })),
    [dataList]
  )

  const controls = useMemo(
    () => ({
      clear: () => {
        setDataList([])
        setSearchText('')
      }
    }),
    []
  )

  return { wrapped, controls }
}

interface ListHeader<D> {
  key?: MayArray<SKeyof<D>>
  label: string
  el: HTMLElement | null
}

export default function ListTable<T>({
  list,
  renderItem,
  renderPropertyLabel,
  propertyLabelTextMapper = (Object.keys(list[0]) as SKeyof<T>[]).map((key) => ({
    key,
    label: key
  })),
  onListChange
}: {
  list: T[]
  renderItem?: (payload: {
    item: T
    key?: MayArray<SKeyof<T>>
    label: string
    wholeDataList: T[]
    header?: ListHeader<T>['el']
    allHeaders: ListHeader<T>[]
  }) => ReactNode
  renderPropertyLabel?: (property: { key?: MayArray<SKeyof<T>>; label: string; wholeList: T[] }) => ReactNode
  /** only when props:`renderPropertyLabel` not exist */
  propertyLabelTextMapper?: MayFunction<
    { key?: MayArray<SKeyof<T>>; label: string }[],
    [properties: SKeyof<T>[], items: T[]]
  >
  onListChange?: (newlist: T[]) => void
}) {
  const { wrapped, controls } = useList(list)

  const headerRefs = useRef<ListHeader<T>[]>([]) // for itemWidth
  const parsedShowedPropertyNames = shrinkToValue(propertyLabelTextMapper, [Object.keys(list[0]), list[0]])
  return (
    <Card className="grid bg-cyberpunk-card-bg border-1.5 border-[rgba(171,196,255,0.2)]" size="lg">
      {/* Header */}
      <Row className="bg-[#141041]">
        {parsedShowedPropertyNames.map(({ key, label }, idx) => (
          <Fragment key={idx}>
            {renderPropertyLabel?.({ key, label, wholeList: list }) ?? (
              <div
                ref={(el) => (headerRefs.current[idx] = { label, el, key })}
                className="grow text-xs font-semibold text-[#abc4ff80] py-3 px-5"
              >
                {label}
              </div>
            )}
          </Fragment>
        ))}
      </Row>
      <Col>
        {/* Body */}
        {list.map((data, idx) => (
          <Row key={isObject(data) ? (data as any)?.id ?? idx : idx} className="text-[#abc4ff] text-xs font-medium">
            {parsedShowedPropertyNames.map(({ key, label }, idx) => {
              const targetDataItemValue =
                key && (Object.entries(data) as [SKeyof<T>, unknown][]).find(([k, v]) => key.includes(k))?.[1]
              const headerElement = headerRefs.current.find(({ label: headerLabel }) => headerLabel === label)?.el
              return (
                <div key={label} style={{ width: headerElement?.clientWidth }}>
                  {renderItem?.({
                    item: data,
                    key,
                    label,
                    wholeDataList: list,
                    allHeaders: headerRefs.current,
                    header: headerElement
                  }) ?? (key ? String(targetDataItemValue) : '(no key)')}
                </div>
              )
            })}
          </Row>
        ))}
      </Col>
    </Card>
  )
}
