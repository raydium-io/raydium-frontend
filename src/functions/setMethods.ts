export function toggleSetItem<T>(set: Set<T>, item: T): Set<T> {
  const newSet = new Set(set)
  if (set.has(item)) {
    newSet.delete(item)
    return newSet
  } else {
    newSet.add(item)
    return newSet
  }
}
