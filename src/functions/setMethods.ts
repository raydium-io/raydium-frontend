export function toggleSetItem<T>(set: Set<T>, item: T): Set<T> {
  const newSet = new Set(set)
  if (set.has(item)) {
    newSet.delete(item)
  } else {
    newSet.add(item)
  }
  return newSet
}

export function isSubSet(subsetA: Set<any>, bigsetB: Set<any>) {
  for (const item of subsetA) {
    if (!bigsetB.has(item)) {
      return false
    }
  }
  return true
}

/** for js set, basic minus operation */
export function setMinus<T>(source: T[] | Set<T>, ...minus: (T[] | Set<T> | undefined)[]) {
  const result = new Set(source)
  minus.forEach((m) => {
    m?.forEach((item) => {
      result.delete(item)
    })
  })
  return result
}
