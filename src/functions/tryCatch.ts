/**
 * simple but useful shortcut
 */
export default function tryCatch<T>(tryFunction: () => T, catchFunction?: (err: unknown) => T): T {
  try {
    return tryFunction()
  } catch (err) {
    // @ts-expect-error force
    return catchFunction?.(err)
  }
}
