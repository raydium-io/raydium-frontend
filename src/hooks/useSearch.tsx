import { shakeUndifindedItem } from '@/functions/arrayMethods'
import { isStringInsensitivelyContain, isStringInsensitivelyEqual } from '@/functions/judgers/areEqual'
import { isNumber, isObject, isString } from '@/functions/judgers/dateType'
import { objectMap, omit } from '@/functions/objectMethods'
import { MayArray } from '@/types/constants'
import { Dispatch, SetStateAction, useState } from 'react'

type SearchConfigItemObj = {
  text: string
  entirely?: boolean
}

export type SearchConfigItem = SearchConfigItemObj | string

export function useSearch<T>(
  items: T[],
  options?: {
    defaultSearchText?: string | number
    /** TODO: if return a array, match first searchedText result will palce first, match second searchedText result will palce second */
    getBeSearchedConfig?: (item: T) => MayArray<SearchConfigItem>
    // TODO: imply sorter
    // resultSorter?: MayArray<(searchText: string, item: T, itemBeSearchedText: SearchConfigItemObj[]) => any>
  }
): { searched: T[]; searchText: string | undefined; setSearchText: Dispatch<SetStateAction<string | undefined>> } {
  const { defaultSearchText, getBeSearchedConfig = extractItemBeSearchedText /* resultSorter */ } = options ?? {}
  // handle candidates
  const [searchText, setSearchText] = useState(defaultSearchText != null ? String(defaultSearchText) : undefined)

  if (!searchText) return { searched: items, searchText, setSearchText }

  const matchedInfos = items
    .map((item) => {
      const searchKeyWords = String(searchText).trim().split(/\s|-/)
      const searchConfigs = [getBeSearchedConfig(item)]
        .flat()
        .map((c) => (isString(c) ? { text: c } : { ...c, text: c.text }) as SearchConfigItemObj)
      return patchSearchInfos({ item, searchKeyWords, searchConfigs })
    })
    .filter((m) => m.matched)

  const sortedMatchedInfos = matchedInfos.sort((matchedInfoA, matchedInfoB) => {
    const { configIdx: aConfigIdx = 0, matchEntirely: aIsEntirelyMatched } = matchedInfoA
    const { configIdx: bConfigIdx = 0, matchEntirely: bIsEntirelyMatched } = matchedInfoB
    if (aConfigIdx === bConfigIdx) {
      return bIsEntirelyMatched && aIsEntirelyMatched ? 0 : aIsEntirelyMatched ? -1 : 1
    }
    return aConfigIdx - bConfigIdx
  })

  // cleaned
  const shaked = shakeUndifindedItem(sortedMatchedInfos.map((m) => m.item))

  // const sorted = searched.sort((candidateA, candidateB)=>{})
  return { searched: shaked, searchText, setSearchText }
}

function extractItemBeSearchedText(item: unknown): SearchConfigItemObj[] {
  if (isString(item) || isNumber(item)) return [{ text: String(item) } as SearchConfigItemObj]
  if (isObject(item)) {
    const obj = objectMap(omit(item as any, ['id', 'key']), (value) =>
      isString(value) || isNumber(value) ? ({ text: String(value) } as SearchConfigItemObj) : undefined
    )
    return shakeUndifindedItem(Object.values(obj))
  }
  return [{ text: '' }]
}

function patchSearchInfos<T>(options: { item: T; searchKeyWords: string[]; searchConfigs: SearchConfigItemObj[] }): {
  item: T
  matched: boolean
  config?: SearchConfigItemObj /* when matched  */
  matchEntirely?: boolean /* when matched  */
  configIdx?: number /* when matched */
} {
  for (const keyword of options.searchKeyWords) {
    for (const [configIdx, config] of options.searchConfigs.entries()) {
      const configIsEntirely = config.entirely
      const matchEntirely = isStringInsensitivelyEqual(config.text, keyword)
      const matchPartial = isStringInsensitivelyContain(config.text, keyword)
      if ((matchEntirely && configIsEntirely) || (matchPartial && !configIsEntirely)) {
        return { item: options.item, matched: true, config, configIdx, matchEntirely }
      }
    }
  }
  return {
    item: options.item,
    matched: false
  }
}
