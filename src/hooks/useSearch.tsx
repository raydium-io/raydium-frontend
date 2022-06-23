import { shakeUndifindedItem } from '@/functions/arrayMethods'
import { isNumber, isObject, isString } from '@/functions/judgers/dateType'
import { objectMap, omit } from '@/functions/objectMethods'
import { MayArray } from '@/types/constants'
import { Dispatch, SetStateAction, useState } from 'react'

type SearchConfigItem = {
  text: string
  matchEntirely?: boolean
}
export function useSearch<T>(
  candidates: T[],
  options?: {
    defaultSearchText?: string | number
    /** TODO: if return a array, match first searchedText result will palce first, match second searchedText result will palce second */
    getBeSearchedConfig?: (item: T) => MayArray<SearchConfigItem | string>
    resultSorter?: MayArray<(searchText: string, item: T, itemBeSearchedText: SearchConfigItem[]) => any>
  }
): { searched: T[]; searchText: string | undefined; setSearchText: Dispatch<SetStateAction<string | undefined>> } {
  const { defaultSearchText, getBeSearchedConfig = extractItemBeSearchedText, resultSorter } = options ?? {}
  // handle candidates
  const [searchText, setSearchText] = useState(defaultSearchText != null ? String(defaultSearchText) : undefined)
  const searched =
    candidates?.filter((candidate) => {
      if (!candidate) return false
      if (!searchText) return true
      const searchKeyWords = String(searchText).trim().toLowerCase().split(/\s|-/)
      const searchConfigs = [getBeSearchedConfig(candidate)]
        .flat()
        .map(
          (c) => (isString(c) ? { text: c.toLowerCase() } : { ...c, text: c.text.toLowerCase() }) as SearchConfigItem
        )
      return searchKeyWords.every((keyword) =>
        searchConfigs.some((config) => {
          if (config.matchEntirely) return config.text === keyword
          return config.text.includes(keyword)
        })
      )
    }) ?? []

  // const sorted = searched.sort((candidateA, candidateB)=>{})
  const sorted = searched
  return { searched: sorted, searchText, setSearchText }
}
function extractItemBeSearchedText(item: unknown): SearchConfigItem[] {
  if (isString(item) || isNumber(item)) return [{ text: String(item) } as SearchConfigItem]
  if (isObject(item)) {
    const obj = objectMap(omit(item as any, ['id', 'key']), (value) =>
      isString(value) || isNumber(value) ? ({ text: String(value) } as SearchConfigItem) : undefined
    )
    return shakeUndifindedItem(Object.values(obj))
  }
  return [{ text: '' }]
}
