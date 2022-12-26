import { useCallback, useMemo, useState } from 'react'

import { ZERO } from '@raydium-io/raydium-sdk'

import { isBigInt, isBN, isBoolean, isFraction, isNumber, isString } from '@/functions/judgers/dateType'
import { isNullish } from '@/functions/judgers/nil'
import { EnumStr } from '@/types/constants'
import { ExactPartial, MayArray } from '@/types/generics'

type SortMode = 'decrease' | 'increase' | 'none'

type SortModeArr = SortMode[]

export type SortConfigItem<D extends Record<string, any>[]> = {
  key: keyof D[number] | EnumStr
  mode: SortMode
  sortModeQueue: SortModeArr

  /**
   * return Numberish / string / boolean
   * if it's a array, means, if compare same in first rule(sortCompare), whatch the next one, and on, and on
   */
  sortCompare: MayArray<(item: D[number]) => any> // for item may be tedius, so use rule,
  useCurrentMode?: boolean
}

export type SimplifiedSortConfig<D extends Record<string, any>[]> = ExactPartial<
  SortConfigItem<D>,
  'mode' | 'sortModeQueue' | 'useCurrentMode'
>

/**
 * don't support too smart configs
 * @param sourceDataList
 * @returns
 */
export default function useSort<D extends Record<string, any>[]>(
  sourceDataList: D,
  options?: {
    defaultSort?: SimplifiedSortConfig<D>
    // /** always at sort bottom */
    // sortBottom?: MayArray<(item: D[number]) => any>
  }
) {
  function parseSortConfig(
    simpleConfig: SimplifiedSortConfig<D>,
    prevConfigs?: SortConfigItem<D>[]
  ): SortConfigItem<D>[] {
    const globalDefaultSortMode = 'decrease'
    const prevIsSameKeyAsInput = prevConfigs?.[0]?.key === simpleConfig.key || simpleConfig.useCurrentMode

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
      prevSortConfigMode &&
      sortModeQueue[
        (sortModeQueue.indexOf(prevSortConfigMode) + (simpleConfig.useCurrentMode ? 0 : 1)) % sortModeQueue.length
      ]

    const mode = userInputSortConfigMode ?? (prevIsSameKeyAsInput ? fromQueued ?? defaultSortMode : defaultSortMode)
    // const mode =
    //   simpleConfig.mode == null && prevConfigs?.[0]?.mode === 'decrease' && prevConfigs?.[0]?.key === simpleConfig.key
    //     ? 'increase'
    //     : 'decrease'
    return [
      {
        ...simpleConfig,
        mode,
        sortModeQueue
      }
    ]
  }

  const defaultConfigs = options?.defaultSort ? parseSortConfig(options.defaultSort) : []

  // currently only consider the first config item
  const [sortConfigs, setConfigs] = useState<SortConfigItem<D>[]>(defaultConfigs)

  const appendConfig = useCallback(
    // 🚧 not imply yet!!!
    (option: { key: keyof D[number]; mode: 'decrease' | 'increase' }) => {
      setConfigs((oldConfigs) =>
        oldConfigs.concat((isString(option) ? { key: option, mode: 'decrease' } : option) as SortConfigItem<D>)
      )
    },
    [setConfigs]
  )

  /** this will cause only one sortConfigItem */
  const setConfig = useCallback(
    (simpleConfig: SimplifiedSortConfig<D>) => {
      setConfigs((currentConfigs) => parseSortConfig(simpleConfig, currentConfigs))
    },
    [setConfigs]
  )

  const clearSortConfig = useCallback(() => {
    setConfigs(defaultConfigs)
  }, [setConfigs])

  const sortConfig = useMemo<SortConfigItem<D> | undefined>(() => sortConfigs[0], [sortConfigs])

  const sortedData = useMemo(() => {
    let configs = sortConfigs
    if (!sortConfigs.length) configs = defaultConfigs
    if (sortConfigs[0].mode === 'none') configs = defaultConfigs
    const [{ mode, sortCompare }] = configs // temp only respect first sortConfigs in queue
    return [...sourceDataList].sort((a, b) => {
      const pickFunctions = [sortCompare].flat()
      if (!pickFunctions.length) return 0

      const compareFactor = pickFunctions.slice(1).reduce(
        (acc, item) =>
          acc(a, b) === 0
            ? (a, b) => {
                const sortValueA = item(a)
                const sortValueB = item(b)

                // nullish first exclude (whenever compare undefined should be the last one)
                if (isNullish(a) && !isNullish(b)) return mode === 'decrease' ? 1 : -1
                if (isNullish(b) && !isNullish(a)) return mode === 'decrease' ? -1 : 1
                return compareForSort(sortValueA, sortValueB)
              }
            : acc,
        (a: D[number], b: D[number]) => compareForSort(pickFunctions[0](a), pickFunctions[0](b))
      )
      return (mode === 'decrease' ? -1 : 1) * compareFactor(a, b)
    })
  }, [sortConfigs, sourceDataList])

  return { sortedData, sortConfigs, sortConfig, setConfig, clearSortConfig }
}

export function compareForSort(a: unknown, b: unknown): number {
  // nullish first exclude
  if (isNullish(a) && !isNullish(b)) return -1
  if (isNullish(b) && !isNullish(a)) return 1
  if (isNullish(a) && isNullish(b)) return 0

  if (isBN(a) && isBN(b)) {
    const sub = a.sub(b)
    return sub.lt(ZERO) ? -1 : sub.gt(ZERO) ? 1 : 0
  } else if (isFraction(a) && isFraction(b)) {
    const sub = a.sub(b).numerator
    return sub.lt(ZERO) ? -1 : sub.gt(ZERO) ? 1 : 0
  } else if (isNumber(a) && isNumber(b)) {
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
  }

  return 0
}
