import { AnyFn } from '@/types/constants'

/**
 * invoke only once, return the cached result when invoke again
 */
export function createCachedFunction<F extends AnyFn>(fn: F): F {
  let cachedResult: ReturnType<F> | undefined = undefined
  return function (...args: Parameters<F>) {
    if (cachedResult == null) {
      cachedResult = fn(...args)
    }
    return cachedResult
  } as F
}

/**
 *
 * all the keys will be cached, even getter
 * @returns a proxied object, which will cache the result when get the value
 */
export function createCachedObject<T extends object>(obj: T): T {
  const cachedObj = {} as T
  return new Proxy(obj, {
    get(target, key, receiver) {
      if (Reflect.has(cachedObj, key)) {
        return Reflect.get(cachedObj, key, receiver)
      } else {
        const value = Reflect.get(target, key, receiver)
        Reflect.set(cachedObj, key, value)
        return value
      }
    },
    set(target, key, value, receiver) {
      return Reflect.set(cachedObj, key, value, receiver)
    }
  })
}
