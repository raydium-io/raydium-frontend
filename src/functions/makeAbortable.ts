export function makeAbortable<T>(fn: (canContinue: () => boolean) => T): {
  /** will change can continue to false */
  abort(): void
  result: Promise<Awaited<T | undefined>>
} {
  let hasAbort = false
  const canContinue = () => !hasAbort
  const abort = () => {
    hasAbort = true
  }
  const result = new Promise((resolve, reject) => {
    Promise.resolve(fn(canContinue)).then(
      (r) => resolve(r as any),
      () => resolve(undefined as any)
    )
  }) as Promise<Awaited<T>>
  return { abort, result }
}
