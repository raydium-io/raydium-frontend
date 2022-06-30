import { Dispatch, SetStateAction, useState } from 'react'
import { SearchOptions, searchItems } from '../functions/searchItems'

/**
 *  if component is controlled, just use {@link searchItems}
 *
 * @param items
 * @param options
 * @returns
 */
export function useSearchText<T>(
  items: T[],
  options?: SearchOptions<T> & {
    defaultSearchText?: string | number /* for uncontrolled component */
  }
): {
  searched: T[]
  searchText: string | undefined /* for uncontrolled component */
  setSearchText: Dispatch<SetStateAction<string | undefined>> /* for uncontrolled component */
} {
  const { defaultSearchText /* TODO: imply resultSorter */ } = options ?? {}
  const [searchText, setSearchText] = useState(defaultSearchText != null ? String(defaultSearchText) : undefined)
  const searched = searchItems(items, { ...options, text: searchText })
  return { searched, searchText, setSearchText }
}
