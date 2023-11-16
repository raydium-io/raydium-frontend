import { useCallback, useMemo, useState } from 'react'

import { ZERO } from '@raydium-io/raydium-sdk'

import { isBigInt, isBN, isBoolean, isFraction, isNumber, isString } from '@/functions/judgers/dateType'
import { isNullish } from '@/functions/judgers/nil'
import { EnumStr } from '@/types/constants'
import { ExactPartial, MayArray } from '@/types/generics'

export type SortMode = 'decrease' | 'increase' | 'none'

export type SortModeArr = SortMode[]

export type SortConfigItem<D extends Record<string, any>[]> = {
  /** key for compare old and new  */
  key: keyof D[number] | EnumStr
  mode: SortMode
  sortModeQueue: SortModeArr

  /**
   * return Numberish / string / boolean
   * if it's a array, means, if compare same in first rule(sortCompare), whatch the next one, and on, and on
   */
  sortCompare: MayArray<(item: D[number]) => any> // for item may be tedius, so use rule,
}

export type SimplifiedSortConfig<D extends Record<string, any>[]> = ExactPartial<
  SortConfigItem<D>,
  'mode' | 'sortModeQueue' | 'key'
>

/**
 * don't support too smart configs
 * @param sourceDataList
 * @returns
 */
export default function useSort<Items extends Record<string, any>[]>(
  sourceDataList: Items,
  options?: {
    /** this config is always work, e.g. when sortBy i.xxx, this config is applied when a.xxx and b.xxx are the same */
    backgroundSortConfig?: SimplifiedSortConfig<Items>
    /** for sourceDataList has been sorted, pass in the init sorting rule */
    defaultSortedConfig?: SimplifiedSortConfig<Items>
  }
) {
  const backgroundSortConfig = options?.backgroundSortConfig ? formatSortConfig(options.backgroundSortConfig) : []

  /**
   * SimplifiedSortConfig => SortConfigItem
   */
  function formatSortConfig(
    simpleConfig: SimplifiedSortConfig<Items>,
    prevConfigs?: SortConfigItem<Items>[]
  ): SortConfigItem<Items>[] {
    const globalDefaultSortMode = 'decrease'
    const prevIsSameKeyAsInput = prevConfigs?.[0]?.key === simpleConfig.key
    const sortModeQueue =
      simpleConfig.sortModeQueue ??
      (prevIsSameKeyAsInput && prevConfigs
        ? prevConfigs[prevConfigs.length - 1]?.sortModeQueue ??
          ([globalDefaultSortMode, 'increase', 'none'] as SortModeArr)
        : ([globalDefaultSortMode, 'increase', 'none'] as SortModeArr))
    const defaultSortMode = sortModeQueue[0] ?? globalDefaultSortMode
    const userInputSortConfigMode = simpleConfig.mode
    const prevSortConfigMode = prevIsSameKeyAsInput ? prevConfigs?.[prevConfigs.length - 1]?.mode : undefined
    const fromQueued =
      prevSortConfigMode && sortModeQueue[(sortModeQueue.indexOf(prevSortConfigMode) + 1) % sortModeQueue.length]
    const mode = userInputSortConfigMode ?? (prevIsSameKeyAsInput ? fromQueued ?? defaultSortMode : defaultSortMode)
    return [
      {
        key: 'anonymous',
        mode,
        sortModeQueue,
        ...simpleConfig
      }
    ]
  }

  const [sortConfigs, setConfigs] = useState<SortConfigItem<Items>[]>(
    options?.defaultSortedConfig ? [formatSortConfig(options.defaultSortedConfig)].flat() : []
  )

  const appendConfig = useCallback(
    // 🚧 not imply yet!!!
    (option: { key: keyof Items[number]; mode: 'decrease' | 'increase' }) => {
      setConfigs((oldConfigs) =>
        oldConfigs.concat((isString(option) ? { key: option, mode: 'decrease' } : option) as SortConfigItem<Items>)
      )
    },
    [setConfigs]
  )

  /** this will cause only one sortConfigItem */
  const setConfig = useCallback(
    (simpleConfig: SimplifiedSortConfig<Items>) => {
      setConfigs((currentConfigs) => formatSortConfig(simpleConfig, currentConfigs))
    },
    [setConfigs]
  )

  const clearSortConfig = useCallback(() => {
    setConfigs(options?.backgroundSortConfig ? formatSortConfig(options.backgroundSortConfig) : [])
  }, [setConfigs])

  const sortConfig = useMemo<SortConfigItem<Items> | undefined>(() => sortConfigs[0], [sortConfigs])

  const sortedData = useMemo(() => {
    const configs = sortConfigs.filter((item) => item.mode !== 'none').concat(backgroundSortConfig)
    const firstConfig = configs[0] // temp only respect first sortConfigs in queue
    const { mode, sortCompare } = firstConfig ?? {} // temp only respect first sortConfigs in queue
    const pickFunctions = [sortCompare].flat()
    const sorted = [...sourceDataList].sort((a, b) => {
      const getCompareFactor: (toCompareA: any, toCompareB: any) => number = pickFunctions.slice(1).reduce(
        (acc, item) =>
          acc(a, b) === 0
            ? (a, b) => {
                const sortValueA = item?.(a)
                const sortValueB = item?.(b)

                // nullish first exclude (whenever compare undefined should be the last one)
                if (isNullish(a) && !isNullish(b)) return mode === 'decrease' ? 1 : -1
                if (isNullish(b) && !isNullish(a)) return mode === 'decrease' ? -1 : 1
                return compareForSort(sortValueA, sortValueB)
              }
            : acc,
        (a: Items[number], b: Items[number]) => compareForSort(pickFunctions[0]?.(a), pickFunctions[0]?.(b))
      )
      const compareResult = getCompareFactor(a, b)
      const sortDirectionFactor = mode === 'decrease' ? -1 : 1
      return sortDirectionFactor * compareResult
    })
    return sorted
  }, [sortConfigs, sourceDataList])

  return { sortedData, sortConfigs, sortConfig, setConfig, clearSortConfig }
}

export function compareForSort(a: unknown, b: unknown): number {
  // nullish first exclude
  if (isNullish(a) && !isNullish(b)) return -1
  if (isNullish(b) && !isNullish(a)) return 1
  if (isNullish(a) && isNullish(b)) return 0

  if (isNumber(a) && isNumber(b)) {
    return a - b
  } else if (isBigInt(a) && isBigInt(b)) {
    return Number(a - b)
  } else if (isBoolean(a) && isBoolean(b)) {
    return Number(a) - Number(b)
  } else if (isString(a) && isString(b)) {
    const numberA = Number(a) // if it's a normal string, `Number()` will return `NaN`
    const numberB = Number(b) // if it's a normal string, `Number()` will return `NaN`
    if (isNaN(numberB) || isNaN(numberA)) {
      // one of them has plain string
      return a.localeCompare(b)
    } else {
      // all number string
      return numberA - numberB
    }
  } else if (isBN(a) && isBN(b)) {
    const sub = a.sub(b)
    return sub.lt(ZERO) ? -1 : sub.gt(ZERO) ? 1 : 0
  } else if (isFraction(a) && isFraction(b)) {
    const sub = a.sub(b).numerator
    return sub.lt(ZERO) ? -1 : sub.gt(ZERO) ? 1 : 0
  } else {
    return 0
  }
}
