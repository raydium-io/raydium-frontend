import { inClient } from '@/functions/judgers/isSSR'
import router from 'next/router'
import { objectShakeNil } from '../objectMethods'
import { shrinkToValue } from '../shrinkToValue'

export function getURLQueryEntry(): Record<string, string | undefined> {
  if (!inClient) return {}
  const searchText = window.location.search
  const searchQuery = searchText
    ? Object.fromEntries(
        searchText
          .slice(1)
          .split('&')
          .map((pair: string) => pair.split('='))
      )
    : {}
  return searchQuery
}

export function applyURLQueryEntry(entry: Record<string, any>) {
  if (!inClient) return
  const parsedEntry = objectShakeNil(entry)
  if (!Object.keys(parsedEntry).length) return
  router.push({ query: objectShakeNil(entry) })
}

export function getURLQuery(key: string): string | undefined {
  return getURLQueryEntry()[key]
}

export function addQuery<T = unknown>(key: string, value: T | ((oldV: T | undefined) => T)) {
  const oldQueries = getURLQueryEntry() ?? {}
  const newValue = shrinkToValue(value, [oldQueries[key] as T | undefined])
  if (String(newValue) !== String(oldQueries[key])) applyURLQueryEntry({ ...oldQueries, [key]: newValue })
}

export function cleanQuery(key: string) {
  return addQuery(key, undefined)
}
