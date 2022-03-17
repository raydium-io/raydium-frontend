import overwriteFunctionName from '@/functions/overwriteFunctionName'
import { AnyFn } from '@/types/constants'

interface Options<OriginalFn extends AnyFn = AnyFn> {
  onError?(info: { error: Error; timestamp: number; originalFn: OriginalFn; inputParams: unknown[] }): void
  onSuccess?(info: { timestamp: number; originalFn: OriginalFn; inputParams: unknown[] }): void
}

export function createLogErrorMethods<TO extends Record<string, AnyFn>>(originalFnObj: TO, options: Options): TO {
  return new Proxy(originalFnObj, {
    get: (target, p) =>
      p in target
        ? createLogErrorFn(target[p as keyof typeof target], options)
        : () => {
            throw new Error(`not imply method:${String(p)}`)
          }
  })
}

function createLogErrorFn<F extends AnyFn>(originalFn: F, options: Options) {
  return overwriteFunctionName(async (...params: any[]) => {
    try {
      const result = await originalFn(...params)
      options.onSuccess?.({ timestamp: Date.now(), originalFn, inputParams: params })
      return result
    } catch (error) {
      options.onError?.({ error: error as Error, timestamp: Date.now(), originalFn, inputParams: params })
    }
  }, originalFn.name) as F
}
