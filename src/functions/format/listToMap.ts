export default function listToMap<T, S extends string, V = T>(
  source: T[],
  getKey: (item: T, index: number) => S,
  getValue?: (item: T, index: number) => V
): Record<S, V> {
  // @ts-expect-error force
  return Object.fromEntries(source.map((item, idx) => [getKey(item, idx), getValue ? getValue(item, idx) : item]))
}

/**
 * @returns a js Map object instead of a plain object
 */
export function listToJSMap<T, S, V = T>(
  source: T[],
  getKey: (item: T, index: number) => S,
  getValue?: (item: T, index: number) => V
): Map<S, V> {
  // @ts-expect-error force
  return new Map(source.map((item, idx) => [getKey(item, idx), getValue ? getValue(item, idx) : item]))
}

/**
 * like list to map, but value will be an array to avoid conflict like {@link listToMap}
 * @example
 * listToMultiItemsMap([{id:1, name:'a'}, {id:2, name:'b'}, {id:1, name:'c'}], (item) => item.id) // => {1: [{id:1, name:'a'}, {id:1, name:'c'}], 2: [{id:2, name:'b'}]}
 */
export function listToMultiItemsMap<T, S extends string>(
  source: T[],
  getKey: (item: T, index: number) => S | undefined
): Record<S, T[]> {
  return Object.fromEntries(
    mergeEntries(source.map((item, idx) => [getKey(item, idx), item]).filter(([key]) => key != null))
  )
}

function mergeEntries<K, V>(entries: ([K, V] | (K & V)[])[]): [K, V[]][] {
  const bucket = new Map<K, V[]>()
  for (const [key, value] of entries) {
    bucket.set(key, [...(bucket.get(key) ?? []), value])
  }
  return [...bucket.entries()]
}
