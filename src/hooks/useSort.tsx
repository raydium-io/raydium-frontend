import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { ZERO } from '@raydium-io/raydium-sdk'

import { isBigInt, isBN, isBoolean, isFraction, isNumber, isString } from '@/functions/judgers/dateType'
import { EnumStr, Numberish } from '@/types/constants'
import { ExactPartial } from '@/types/generics'

type SortMode = 'decrease' | 'increase' | 'none'

type SortModeArr = SortMode[]

type SortConfigItem<D extends Record<string, any>[]> = {
  key: keyof D[number] | EnumStr
  mode: SortMode
  sortModeQueue: SortModeArr

  /** return Numberish / string / boolean*/
  pickSortValue: (item: D[number]) => any // for item may be tedius, so use rule
}

type SimplifiedSortConfig<D extends Record<string, any>[]> = ExactPartial<SortConfigItem<D>, 'mode' | 'sortModeQueue'>

/**
 * don't support too smart configs
 * @param sourceDataList
 * @returns
 */
export default function useSort<D extends Record<string, any>[]>(
  sourceDataList: D,
  options?: {
    defaultSort?: SimplifiedSortConfig<D>
  }
) {
  function parseSortConfig(
    simpleConfig: SimplifiedSortConfig<D>,
    prevConfigs?: SortConfigItem<D>[]
  ): SortConfigItem<D>[] {
    const globalDefaultSortMode = 'decrease'
    const prevIsSameKeyAsInput = prevConfigs?.[0]?.key === simpleConfig.key
    const sortModeQueue =
      simpleConfig.sortModeQueue ??
      (prevIsSameKeyAsInput
        ? prevConfigs[prevConfigs.length - 1]?.sortModeQueue ??
          ([globalDefaultSortMode, 'increase', 'none'] as SortModeArr)
        : ([globalDefaultSortMode, 'increase', 'none'] as SortModeArr))
    const defaultSortMode = sortModeQueue[0] ?? globalDefaultSortMode

    const userInputSortConfigMode = simpleConfig.mode
    const prevSortConfigMode = prevIsSameKeyAsInput ? prevConfigs?.[prevConfigs.length - 1]?.mode : undefined
    const fromQueued =
      prevSortConfigMode && sortModeQueue[(sortModeQueue.indexOf(prevSortConfigMode) + 1) % sortModeQueue.length]

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

  // currently only consider the first config item
  const [sortConfigs, setConfigs] = useState<SortConfigItem<D>[]>(
    options?.defaultSort ? parseSortConfig(options.defaultSort) : []
  )

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
    setConfigs([] as SortConfigItem<D>[])
  }, [setConfigs])

  const sortConfig = useMemo<SortConfigItem<D> | undefined>(() => sortConfigs[0], [sortConfigs])

  const sortedData = useMemo(() => {
    if (!sortConfigs.length) return sourceDataList
    const [{ mode, pickSortValue }] = sortConfigs // temp only respect first sortConfigs in queue
    if (mode === 'none') return [...sourceDataList]
    return [...sourceDataList].sort(
      (a, b) => (mode === 'decrease' ? -1 : 1) * compareForSort(pickSortValue(a), pickSortValue(b))
    )
  }, [sortConfigs, sourceDataList])

  return { sortedData, sortConfigs, sortConfig, setConfig, clearSortConfig }
}

function compareForSort(a: unknown, b: unknown): number {
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
