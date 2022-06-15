/**
 * depends on <List>
 */

import { isNumber, isObject } from '@/functions/judgers/dateType'
import { shrinkToValue } from '@/functions/shrinkToValue'
import { MayArray, MayFunction } from '@/types/constants'
import { SKeyof } from '@/types/generics'
import { ReactNode, Fragment, useRef, CSSProperties } from 'react'
import Card from './Card'
import Col from './Col'
import useListDataManager from '../hooks/useListDataManager'
import Grid from './Grid'
import { twMerge } from 'tailwind-merge'
import { toHumanReadable } from '@/functions/format/toHumanReadable'

interface ListTableHeader<D> {
  key?: MayArray<SKeyof<D>>
  label: string
  el: HTMLElement | null
}

type ListTableMap<T> = {
  key?: MayArray<SKeyof<T>>
  label: string
  cssGridItemWidth?: string // default '1fr'
}

type ListTableProps<T> = {
  // --------- core ---------
  list: T[]
  getItemKey: (item: T, idx: number) => string | number | undefined
  labelMapper?: MayFunction<ListTableMap<T>[], [properties?: SKeyof<T>[], items?: T]>

  // --------- classNames ---------
  className?: string
  rowClassName?: MayFunction<
    string,
    [
      {
        index: number
        itemData: T
      }
    ]
  >
  bodyCardClassName?: string
  headerCardClassName?: string

  // --------- callbacks ---------
  onClickRow?: (payload: { index: number; itemData: T }) => void
  onListChange?: (newlist: T[]) => void

  // --------- render ---------
  renderRowItem?: (payload: {
    item: T
    index: number
    key?: MayArray<SKeyof<T>>
    label: string
    wholeDataList: T[]
    header?: ListTableHeader<T>['el']
    allHeaders: ListTableHeader<T>[]
  }) => ReactNode
  renderRowEntry?: (payload: {
    contentNode: ReactNode
    destorySelf(): void
    changeSelf(newItem: T): void
    itemData: T
    index: number
  }) => ReactNode
  renderPropertyLabel?: (property: { key?: MayArray<SKeyof<T>>; label: string; wholeList: T[] }) => ReactNode
}

export default function ListTable<T>({
  className,
  rowClassName,
  bodyCardClassName,
  headerCardClassName,

  onClickRow,

  list,
  getItemKey,
  renderRowItem,
  renderRowEntry,
  renderPropertyLabel,
  labelMapper = (Object.keys(list[0]) as SKeyof<T>[]).map((key) => ({ key, label: key })),
  onListChange
}: ListTableProps<T>) {
  const { wrapped, controls } = useListDataManager(list, getItemKey, { onListChange })

  const headerRefs = useRef<ListTableHeader<T>[]>([]) // for itemWidth
  const parsedShowedPropertyNames = shrinkToValue(labelMapper, [Object.keys(list[0] ?? {}), list[0]])

  const gridTemplateStyle = {
    gridTemplateColumns: parsedShowedPropertyNames.map((i) => i.cssGridItemWidth ?? '1fr').join(' '),
    gap: 4
  } as CSSProperties

  const renderListTableRowContent = ({ data }: typeof wrapped[number], idx: number) => (
    <Grid
      className={twMerge(
        'text-[#abc4ff] text-xs font-medium py-4 px-5 -mx-5 items-center',
        shrinkToValue(rowClassName, [{ index: idx, itemData: data }])
      )}
      style={gridTemplateStyle}
      onClick={() => {
        onClickRow?.({ index: idx, itemData: data })
      }}
    >
      {parsedShowedPropertyNames.map(({ key, label }) => {
        const targetDataItemValue =
          key &&
          (Object.entries(data) as [SKeyof<T>, unknown][]).find(([k, v]) =>
            (isNumber(k) ? String(k) : k).includes(k)
          )?.[1]
        const headerElement = headerRefs.current.find(({ label: headerLabel }) => headerLabel === label)?.el
        return (
          <div key={label} style={{ width: headerElement?.clientWidth }}>
            {renderRowItem
              ? renderRowItem({
                  item: data,
                  index: idx,
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
    </Grid>
  )

  return (
    <Card
      className={twMerge('grid bg-cyberpunk-card-bg border-1.5 border-[rgba(171,196,255,0.2)]', className)}
      size="lg"
    >
      {/* Header */}
      <Grid
        className={twMerge('bg-[#141041] px-5 rounded-tr-inherit rounded-tl-inherit items-center', headerCardClassName)}
        style={gridTemplateStyle}
      >
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
      </Grid>
      <Col className={twMerge('px-5 divide-y divide-[#abc4ff1a]', bodyCardClassName)}>
        {/* Body */}
        {wrapped.map(({ data, destorySelf, changeSelf }, idx) => {
          const RowContent = renderListTableRowContent({ data, destorySelf, changeSelf }, idx)
          return (
            <div key={isObject(data) ? (data as any)?.id ?? idx : idx} className="relative">
              {renderRowEntry?.({
                contentNode: RowContent,
                destorySelf,
                changeSelf,
                itemData: data,
                index: idx
              }) ?? RowContent}
            </div>
          )
        })}
      </Col>
    </Card>
  )
}
