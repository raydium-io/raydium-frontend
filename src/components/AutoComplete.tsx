import useAppSettings from '@/application/appSettings/useAppSettings'
import { isString } from '@/functions/judgers/dateType'
import { inClient } from '@/functions/judgers/isSSR'
import { mergeFunction } from '@/functions/merge'
import mergeRef from '@/functions/react/mergeRef'
import { shrinkToValue } from '@/functions/shrinkToValue'
import { useElementStateRef } from '@/hooks/useElementStateRef'
import { useInfinateScroll } from '@/hooks/useInfinateScroll'
import { ReactNode, useEffect, useRef, useState } from 'react'
import { useSearchText } from '../hooks/useSearchText'
import { SearchOptions } from '../functions/searchItems'
import Card from './Card'
import Icon from './Icon'
import Input, { InputComponentHandler, InputProps } from './Input'
import Popover, { PopoverHandles } from './Popover'

export type AutoCompleteCandidateItem<Item = any> =
  | string
  | {
      /**
       * for search (if not inner search property is provided )
       * for item ui (if `renderCandidateItem` is not defined)
       * for filled text of `<Input>`
       */
      label: string

      searchText?: SearchOptions<Item>['matchConfigs']

      /** for React list key */
      id?: string
    }

export type AutoCompleteProps<T extends AutoCompleteCandidateItem<T>> = {
  candidates: T[]
  renderCandidateItem?: (payloads: {
    candidate: T
    idx: number
    candidates: T[] | undefined
    isSelected: boolean
  }) => ReactNode
  renderCandidatePanelCard?: (payloads: { children: ReactNode; candidates: T[] | undefined }) => ReactNode
  // when blur from `<AutoComplete>` this fn will also invoked
  onSelectCandiateItem?: (payloads: { selected: T; idx: number }) => void
  onBlurMatchCandiateFailed?: (payloads: { text: string | undefined }) => void
} & (InputProps & { inputProps?: InputProps })

export default function AutoComplete<T extends AutoCompleteCandidateItem<T>>({
  value,
  defaultValue,

  candidates,
  renderCandidateItem,
  renderCandidatePanelCard,
  onSelectCandiateItem,
  onBlurMatchCandiateFailed,
  ...restProps
}: AutoCompleteProps<T>) {
  const isMobile = useAppSettings((s) => s.isMobile)

  // card should have same width as <Input>
  const inputWrapperRef = useRef<HTMLElement>(null)
  const inputComponentRef = useRef<InputComponentHandler>(null)
  const [inputWidth, setInputWidth] = useState<number>()

  useEffect(() => {
    const resizeObserver = new ResizeObserver(() => {
      setInputWidth(inputWrapperRef.current?.clientWidth)
    })
    if (inClient && inputWrapperRef.current) {
      resizeObserver.observe(inputWrapperRef.current)
      return () => resizeObserver.disconnect()
    }
  }, [])

  const [selectedCandidateIdx, setCurrentCandidateIdx] = useState<number>()

  const { searched, searchText, setSearchText } = useSearchText(candidates ?? [], {
    defaultSearchText: defaultValue ?? value,
    matchConfigs: (candidate) =>
      isString(candidate)
        ? candidate
        : shrinkToValue(candidate.searchText, [candidate]) ?? candidate.label + ' ' + candidate.id
  })

  const popoverScrollDivRef = useElementStateRef<HTMLDivElement>()
  const renderItemCount = useInfinateScroll(popoverScrollDivRef, { items: searched })

  const filtered = searched.slice(0, renderItemCount)

  // update seletedIdx when filtered result change
  useEffect(() => {
    if (selectedCandidateIdx != null && filtered?.length) {
      setCurrentCandidateIdx(Math.max(Math.min(selectedCandidateIdx, filtered.length - 1), 0))
    }
  }, [filtered])

  function applySelectedIndex(idx: number) {
    if (!filtered) return
    const targetCandidate = filtered[idx]
    if (!targetCandidate) return
    setCurrentCandidateIdx(idx)
    onSelectCandiateItem?.({ selected: targetCandidate, idx: idx })
    const labelString = isString(targetCandidate) ? targetCandidate : targetCandidate.label
    inputComponentRef.current?.setInputText(labelString)
    setSearchText(labelString)
  }

  // have to open popover manually in some case
  const popoverComponentRef = useRef<PopoverHandles>(null)

  const autoCompleteItemsContent = (
    <>
      {filtered?.length ? (
        filtered.map((candidate, idx, candidates) =>
          candidate ? (
            <div
              key={isString(candidate) ? candidate : candidate.id ?? `${idx}_${candidate.label}`}
              className="clickable border-[#abc4ff1a]" /* divide-[#abc4ff1a] is not very stable */
              onClick={() => {
                setSearchText(isString(candidate) ? candidate : candidate.label ?? candidate.id)
                applySelectedIndex(idx) // TODO: get rid of index for index is not good for HotReload
                popoverComponentRef.current?.off()
              }}
            >
              {createLabelNode({
                candidate,
                idx,
                candidates,
                isSelected: idx === selectedCandidateIdx,
                renderNode: renderCandidateItem
              })}
            </div>
          ) : null
        )
      ) : (
        <div className="text-center text-[#abc4ff80] font-medium">(no searched result)</div>
      )}
    </>
  )
  return (
    <Popover placement="bottom" componentRef={popoverComponentRef} closeDelay={100}>
      <Popover.Button>
        <Input
          {...restProps}
          {...restProps.inputProps}
          domRef={mergeRef(inputWrapperRef, restProps.domRef, restProps.inputProps?.domRef)}
          componentRef={inputComponentRef}
          value={searchText}
          defaultValue={searchText}
          suffix={(innerhandler) =>
            innerhandler.text ? (
              <Icon
                heroIconName="x"
                size={isMobile ? 'sm' : 'smi'}
                className={`text-[rgba(196,214,255,0.5)] transition clickable ${
                  innerhandler.text ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
                onClick={() => {
                  innerhandler.setInputText('', { isUserInput: true })
                }}
              />
            ) : (
              shrinkToValue(restProps.inputProps?.suffix ?? restProps.suffix, [innerhandler])
            )
          }
          onUserInput={mergeFunction(
            (text) => {
              setSearchText(text)
              popoverComponentRef.current?.on()
            },
            restProps.onUserInput,
            restProps.inputProps?.onUserInput
          )}
          onBlur={(...args) => {
            const haveOnlyMultiCandidate = filtered?.length === 1
            if (haveOnlyMultiCandidate) {
              setCurrentCandidateIdx(0)
              applySelectedIndex(0)
            } else {
              onBlurMatchCandiateFailed?.({ text: String(searchText) })
            }
            restProps.onBlur?.(...args)
            restProps.inputProps?.onBlur?.(...args)
          }}
          inputHTMLProps={{
            onKeyDown: (e) => {
              if (e.key === 'ArrowUp') {
                if (!filtered) return
                setCurrentCandidateIdx((s) => Math.max((s ?? 0) - 1, 0))
              } else if (e.key === 'ArrowDown') {
                if (!filtered) return
                setCurrentCandidateIdx((s) => Math.min((s ?? 0) + 1, filtered.length - 1))
              } else if (e.key === 'Enter') {
                if (selectedCandidateIdx != null) applySelectedIndex(selectedCandidateIdx)
                popoverComponentRef.current?.off()
              } else if (e.key === 'Escape') {
                inputComponentRef.current?.blur()
                popoverComponentRef.current?.off()
              }
            }
          }}
        />
      </Popover.Button>
      <Popover.Panel style={{ width: inputWidth }}>
        {renderCandidatePanelCard ? (
          shrinkToValue(renderCandidatePanelCard, [{ children: autoCompleteItemsContent, candidates: filtered ?? [] }])
        ) : (
          <Card
            className="flex flex-col py-3 border-1.5 border-[#abc4ff80] bg-[#141041] shadow-cyberpunk-card"
            size="md"
          >
            <div
              className="divide-y divide-[#abc4ff1a] max-h-[40vh] px-2 overflow-auto"
              ref={popoverScrollDivRef as any}
            >
              {autoCompleteItemsContent}
            </div>
          </Card>
        )}
      </Popover.Panel>
    </Popover>
  )
}

function createLabelNode<T extends AutoCompleteCandidateItem<T>>({
  candidate,
  idx,
  candidates,
  isSelected,
  renderNode
}: {
  candidate: T
  idx: number
  candidates: T[]
  isSelected: boolean
  renderNode?: AutoCompleteProps<T>['renderCandidateItem']
}): React.ReactNode {
  if (!candidate) return null
  return renderNode ? (
    renderNode({ candidate, idx, candidates, isSelected })
  ) : (
    <div className="py-3">{isString(candidate) ? candidate : candidate.label}</div>
  )
}
