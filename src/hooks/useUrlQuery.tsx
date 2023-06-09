import { useIsomorphicLayoutEffect } from '@/hooks/useIsomorphicLayoutEffect'
import { addQuery, getURLQuery } from '@/functions/dom/getURLQueryEntries'
import useUpdate from '@/hooks/useUpdate'

export function useUrlQuery<T extends string = string>(options: {
  currentValue?: T
  values: readonly T[]
  onChange?: (v: T) => void
  queryKey: string | undefined
}) {
  useIsomorphicLayoutEffect(() => {
    // apply from url
    if (!options.queryKey) return
    const initTabValue = getURLQuery(options.queryKey) as T | undefined
    if (initTabValue && options.values.includes(initTabValue)) {
      options.onChange?.(initTabValue)
    }
  }, [])

  useUpdate(() => {
    if (!options.queryKey) return
    if (options.currentValue) {
      addQuery(options.queryKey, options.currentValue)
    }
  }, [options.currentValue])
}
