export function createTimeoutMap<K, V>({ maxAgeMs }: { maxAgeMs: number }) {
  const innerMap = new Map<K, { createAt: number; value: V }>()

  const timeoutMap = {
    get(key: K): V | undefined {
      const item = innerMap.get(key)
      if (!item) return undefined
      if (Date.now() - item.createAt > maxAgeMs) {
        innerMap.delete(key)
        return undefined
      }
      return item.value
    },
    set(key: K, value: V) {
      innerMap.set(key, { createAt: Date.now(), value })
      return timeoutMap
    },
    delete(key: K) {
      innerMap.delete(key)
      return timeoutMap
    },
    clear() {
      innerMap.clear()
      return timeoutMap
    },
    has(key: K) {
      return timeoutMap.get(key) !== undefined
    }
  }
  return timeoutMap
}
