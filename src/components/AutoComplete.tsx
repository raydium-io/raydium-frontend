import { isString } from '@/functions/judgers/dateType'
import { mergeFunction } from '@/functions/merge'
import mergeRef from '@/functions/react/mergeRef'
import { shrinkToValue } from '@/functions/shrinkToValue'
import { Fragment, ReactNode, useEffect, useRef, useState } from 'react'
import Card from './Card'
import Input, { InputProps } from './Input'
import Popover, { PopoverHandles } from './Popover'

export type AutoCompleteCandidateItem =
  | string
  | {
      /**
       * for search
       * for item ui (if `renderCandidateItem` is not defined)
       */
      label?: string
      /** for React list key */
      id?: string
    }

export type AutoCompleteProps<T extends AutoCompleteCandidateItem | undefined> = {
  candidates?: T[]
  renderCandidateItem?: (candidate: T, idx: number, candidates: T[]) => ReactNode
  renderCandidatePanelCard?: (payloads: { children: ReactNode; candidates: T[] }) => ReactNode
} & (InputProps & { inputProps?: InputProps })

export default function AutoComplete<T extends AutoCompleteCandidateItem | undefined>({
  candidates,
  renderCandidateItem,
  renderCandidatePanelCard,
  ...restProps
}: AutoCompleteProps<T>) {
  // card should have same width as <Input>
  const inputRef = useRef<HTMLInputElement>(null)
  const [inputWidth, setInputWidth] = useState<number>()
  useEffect(() => {
    setInputWidth(inputRef.current?.clientWidth)
  }, [])

  // handle candidates
  const [searchText, setSearchText] = useState<string>()
  const filtered = candidates
    ?.filter((candidate) => {
      if (!candidate) return false
      if (!searchText) return true

      const lowercasedSearchText = searchText?.toLowerCase()
      const candidateText = (isString(candidate) ? candidate : candidate.label)?.toLowerCase() ?? ''

      return candidateText.includes(lowercasedSearchText)
    })
    .slice(0, 20)

  // have to open popover manually in some case
  const popoverComponentRef = useRef<PopoverHandles>(null)
  const autoCompleteItemsContent = (
    <>
      {filtered?.length ? (
        filtered.map((candidate, idx, candidates) =>
          candidate ? (
            <Fragment key={isString(candidate) ? candidate : candidate.id ?? `${idx}_${candidate.label}`}>
              {createLabelNode(candidate, idx, candidates, renderCandidateItem)}
            </Fragment>
          ) : null
        )
      ) : (
        <div className="text-center text-[#abc4ff80] font-medium">(no searched result)</div>
      )}
    </>
  )
  return (
    <Popover placement="bottom" componentRef={popoverComponentRef}>
      <Popover.Button>
        <Input
          {...restProps}
          {...restProps.inputProps}
          domRef={mergeRef(inputRef, restProps.domRef, restProps.inputProps?.domRef)}
          onUserInput={mergeFunction(
            (text) => {
              setSearchText(text)
              popoverComponentRef.current?.on()
            },
            restProps.onUserInput,
            restProps.inputProps?.onUserInput
          )}
        />
      </Popover.Button>
      <Popover.Panel style={{ width: inputWidth }}>
        {renderCandidatePanelCard ? (
          shrinkToValue(renderCandidatePanelCard, [{ children: autoCompleteItemsContent, candidates: filtered ?? [] }])
        ) : (
          <Card
            className="flex flex-col py-3 px-4 border-1.5 border-[#abc4ff80] bg-[#141041] shadow-cyberpunk-card"
            size="md"
          >
            <div className="divide-y divide-[#abc4ff1a] max-h-[40vh] px-2 overflow-auto">
              {autoCompleteItemsContent}
            </div>
          </Card>
        )}
      </Popover.Panel>
    </Popover>
  )
}

function createLabelNode<T extends AutoCompleteCandidateItem | undefined>(
  candidate: T,
  idx: number,
  candidates: T[],
  renderNode?: (candidate: T, idx: number, candidates: T[]) => React.ReactNode
): React.ReactNode {
  if (!candidate) return null
  return renderNode ? (
    renderNode(candidate, idx, candidates)
  ) : (
    <div className="py-3">{isString(candidate) ? candidate : candidate.label}</div>
  )
}
