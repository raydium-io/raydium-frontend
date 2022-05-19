/**
 * depends on <List>
 */

import { isObject, isString } from '@/functions/judgers/dateType'
import { shrinkToValue } from '@/functions/shrinkToValue'
import { MayArray, MayFunction } from '@/types/constants'
import { SKeyof } from '@/types/generics'
import { ReactNode, Fragment, useRef } from 'react'
import Card from './Card'
import Col from './Col'
import Row from './Row'
import useListDataManager from '../hooks/useListDataManager'
import Icon from './Icon'

interface ListHeader<D> {
  key?: MayArray<SKeyof<D>>
  label: string
  el: HTMLElement | null
}

export default function ListTable<T>({
  list,
  renderItem,
  renderRowControls,
  renderPropertyLabel,
  labelMapper = (Object.keys(list[0]) as SKeyof<T>[]).map((key) => ({
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
  renderRowControls?: (payload: { destorySelf(): void; changeSelf(newItem: T): void }) => ReactNode
  renderPropertyLabel?: (property: { key?: MayArray<SKeyof<T>>; label: string; wholeList: T[] }) => ReactNode
  /** only when props:`renderPropertyLabel` not exist */
  labelMapper?: MayFunction<{ key?: MayArray<SKeyof<T>>; label: string }[], [properties?: SKeyof<T>[], items?: T]>
  onListChange?: (newlist: T[]) => void
}) {
  const { wrapped, controls } = useListDataManager(list, { onListChange })

  const headerRefs = useRef<ListHeader<T>[]>([]) // for itemWidth
  const parsedShowedPropertyNames = shrinkToValue(labelMapper, [Object.keys(list[0] ?? {}), list[0]])
  return (
    <Card className="grid bg-cyberpunk-card-bg border-1.5 border-[rgba(171,196,255,0.2)]" size="lg">
      {/* Header */}
      <Row className="bg-[#141041] px-5 rounded-tr-inherit rounded-tl-inherit">
        {parsedShowedPropertyNames.map(({ key, label }, idx) => (
          <Fragment key={idx}>
            {renderPropertyLabel?.({ key, label, wholeList: list }) ?? (
              <div
                ref={(el) => (headerRefs.current[idx] = { label, el, key })}
                className="grow text-xs font-semibold text-[#abc4ff80] py-3"
              >
                {label}
              </div>
            )}
          </Fragment>
        ))}
      </Row>
      <Col className="px-5 divide-y divide-[#abc4ff1a]">
        {/* Body */}
        {wrapped.map(({ data, destorySelf, changeSelf }, idx) => (
          <div key={isObject(data) ? (data as any)?.id ?? idx : idx} className="relative">
            <Row className="text-[#abc4ff] text-xs font-medium py-4">
              {parsedShowedPropertyNames.map(({ key, label }) => {
                const targetDataItemValue =
                  key && (Object.entries(data) as [SKeyof<T>, unknown][]).find(([k, v]) => key.includes(k))?.[1]
                const headerElement = headerRefs.current.find(({ label: headerLabel }) => headerLabel === label)?.el
                return (
                  <div key={label} style={{ width: headerElement?.clientWidth }}>
                    {renderItem
                      ? renderItem({
                          item: data,
                          key,
                          label,
                          wholeDataList: list,
                          allHeaders: headerRefs.current,
                          header: headerElement
                        })
                      : key
                      ? String(targetDataItemValue ?? '')
                      : ''}
                  </div>
                )
              })}

              {/* Controls */}
            </Row>
            {renderRowControls && (
              <div className="absolute -right-16 top-1/2 -translate-y-1/2">
                {renderRowControls({ destorySelf, changeSelf })}
              </div>
            )}
          </div>
        ))}
      </Col>
    </Card>
  )
}
