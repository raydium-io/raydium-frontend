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
    .map((item) => getMatchedInfos<T>(item, searchText, getBeSearchedConfig))
    .filter((m) => m.matched)

  const sortedMatchedInfos = sortMatchedInfos<T>(matchedInfos)
  const shaked = shakeUndifindedItem(sortedMatchedInfos.map((m) => m.item))

  // const sorted = searched.sort((candidateA, candidateB)=>{})
  return { searched: shaked, searchText, setSearchText }
}

function getMatchedInfos<T>(
  item: T,
  searchText: string,
  getBeSearchedConfig: (item: T) => MayArray<SearchConfigItem>
): MatchedInfo<T> {
  const searchKeyWords = String(searchText).trim().split(/\s|-/)
  const searchConfigs = [getBeSearchedConfig(item)]
    .flat()
    .map((c) => (isString(c) ? { text: c } : { ...c, text: c.text }) as SearchConfigItemObj)
  return patchSearchInfos({ item, searchKeyWords, searchConfigs })
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

type MatchedInfo<T> = {
  item: T
  matched: boolean
  configs: SearchConfigItemObj[]
  matchedConfigs: {
    entirelyMatched: boolean

    config: SearchConfigItemObj
    configIdx: number

    searchedKeywordText: string
    searchedKeywordIndx: number
  }[]
}

/** it produce matched search config infos */
function patchSearchInfos<T>(options: {
  item: T
  searchKeyWords: string[]
  searchConfigs: SearchConfigItemObj[]
}): MatchedInfo<T> {
  const matchInfos: MatchedInfo<T> = {
    item: options.item,
    configs: options.searchConfigs,
    matched: false,
    matchedConfigs: []
  }
  for (const [keywordIdx, keyword] of options.searchKeyWords.entries()) {
    for (const [configIdx, config] of options.searchConfigs.entries()) {
      const configIsEntirely = config.entirely
      const matchEntirely = isStringInsensitivelyEqual(config.text, keyword)
      const matchPartial = isStringInsensitivelyContain(config.text, keyword)
      if ((matchEntirely && configIsEntirely) || (matchPartial && !configIsEntirely)) {
        matchInfos.matched = true
        matchInfos.matchedConfigs.push({
          config,
          configIdx,
          entirelyMatched: matchEntirely,
          searchedKeywordIndx: keywordIdx,
          searchedKeywordText: keyword
        })
      }
    }
  }
  return matchInfos
}

function sortMatchedInfos<T>(matchedInfos: MatchedInfo<T>[]) {
  return matchedInfos.sort((matchedInfoA, matchedInfoB) => {
    const aEntirelyMatchedConfigs = matchedInfoA.matchedConfigs.filter((c) => c.entirelyMatched)
    const bEntirelyMatchedConfigs = matchedInfoB.matchedConfigs.filter((c) => c.entirelyMatched)

    // entire first !!!
    if (aEntirelyMatchedConfigs.length && !bEntirelyMatchedConfigs.length) return -1
    if (bEntirelyMatchedConfigs.length && !aEntirelyMatchedConfigs.length) return 1
    if (aEntirelyMatchedConfigs.length && bEntirelyMatchedConfigs.length) {
      const aEntirelyConfigLowestIdx = Math.min(...aEntirelyMatchedConfigs.map((c) => c.configIdx))
      const bEntirelyConfigLowestIdx = Math.min(...bEntirelyMatchedConfigs.map((c) => c.configIdx))
      return aEntirelyConfigLowestIdx - bEntirelyConfigLowestIdx
    }

    const aPartialMatchedConfigs = matchedInfoA.matchedConfigs.filter((c) => !c.entirelyMatched)
    const bPartialMatchedConfigs = matchedInfoB.matchedConfigs.filter((c) => !c.entirelyMatched)

    const aPartialConfigLowestIdx = Math.min(...aPartialMatchedConfigs.map((c) => c.configIdx))
    const bPartialConfigLowestIdx = Math.min(...bPartialMatchedConfigs.map((c) => c.configIdx))
    return aPartialConfigLowestIdx - bPartialConfigLowestIdx
  })
}

/**
 *
 * @example =>[0, 1, 2, 0, 2, 1]
 *
 */
// function toMatchedConfigSequence<T>(matchedInfo: MatchedInfo<T>): number[] {

//   const sequence = []
//   matchedInfo.configs.forEach(config=>{
//     sequence[config.]
//   })
//   return
// }
