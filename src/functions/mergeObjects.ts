/**
 * merge without access, you can config transformer for detail control
 * @example
 * mergeObjectsWithConfigs([{a: 3, b: 2}, {a: 1, b: 3}], (key, v1, v2) => (key === 'a') ? [v1, v2] : v2) // {a: [3,1], b: 3}
 */
export function mergeObjectsWithConfigs<T extends object>(
  objs: T[],
  transformer: (payloads: { key: string | symbol; valueA: any; valueB: any }) => any = ({ valueA, valueB }) => valueB
): T {
  if (objs.length === 0) return {} as T
  if (objs.length === 1) return objs[0]!

  let keys: (string | symbol)[] | undefined = undefined

  function getOwnKeys() {
    if (!keys) {
      keys = getObjKeys(...objs)
    }
    return keys
  }

  return new Proxy(objs[0], {
    get: (_target, key) => getValue(objs, key, transformer),
    has: (_target, key) => getOwnKeys().includes(key as string),
    getPrototypeOf: () => (objs[0] ? Object.getPrototypeOf(objs[0]) : null),
    ownKeys: getOwnKeys,
    // for Object.keys to filter
    getOwnPropertyDescriptor: (_target, prop) => {
      for (const obj of objs) {
        if (Reflect.has(obj, prop)) {
          return Reflect.getOwnPropertyDescriptor(obj, prop)
        }
      }
    }
  }) as T
}

/**
 * pure merge object with proxy
 * @param objs target objects
 * @example
 * mergeObjects({a: 3, b: 2}, {a: 1, b: 3}) // {a: 1, b: 3}
 */
export function mergeObjects<T, W>(...objs: [T, W]): T & W
export function mergeObjects<T, W, X>(...objs: [T, W, X]): T & W & X
export function mergeObjects<T, W, X, Y>(...objs: [T, W, X, Y]): T & W & X & Y
export function mergeObjects<T, W, X, Y, Z>(...objs: [T, W, X, Y, Z]): T & W & X & Y & Z
export function mergeObjects<T extends object | undefined>(...objs: T[]): T
export function mergeObjects<T extends object | undefined>(...objs: T[]): T {
  if (objs.length === 0) return {} as T
  if (objs.length === 1) return objs[0]! ?? {}
  let reversedObjs: typeof objs | undefined = undefined
  let keys: (string | symbol)[] | undefined = undefined
  function getOwnKeys() {
    if (!keys) {
      keys = getObjKeys(...objs)
    }
    return keys
  }
  return new Proxy(
    {},
    {
      get(_target, key) {
        if (!reversedObjs) {
          reversedObjs = [...objs].reverse()
        }
        for (const obj of reversedObjs) {
          if (obj && key in obj) {
            const v = obj[key]
            if (v !== undefined) {
              return v
            }
          }
        }
      },
      has: (_target, key) => getOwnKeys().includes(key as string),
      getPrototypeOf: () => (objs[0] ? Object.getPrototypeOf(objs[0]) : null),
      ownKeys: getOwnKeys,
      // for Object.keys to filter
      getOwnPropertyDescriptor: (_target, prop) => {
        for (const obj of objs) {
          if (obj && Reflect.has(obj, prop)) {
            return Reflect.getOwnPropertyDescriptor(obj, prop)
          }
        }
      }
    }
  ) as T
}

/**
 *
 * @param keys specifyed keys (can have duplicated keys)
 * @returns
 */
export function createEmptyObject(keys: (string | symbol)[]) {
  const result = {}
  for (const key of keys) {
    result[key] = undefined
  }
  return result
}

function getValue<T extends object>(
  objs: T[],
  key: string | symbol,
  valueMatchRule: (payloads: { key: string | symbol; valueA: any; valueB: any }) => any
) {
  let valueA = undefined
  for (const obj of objs) {
    const valueB = obj[key]
    valueA = valueA != null && valueB !== null ? valueMatchRule({ key, valueA, valueB }) : valueB ?? valueA
  }
  return valueA
}

export function getObjKeys<T extends object | undefined>(...objs: T[]) {
  if (objs.length <= 1) {
    const obj = objs[0]
    return obj ? Reflect.ownKeys(obj) : []
  } else {
    const result = new Set<string | symbol>()
    for (const obj of objs) {
      if (!obj) continue
      Reflect.ownKeys(obj).forEach((k) => result.add(k))
    }
    return Array.from(result)
  }
}
