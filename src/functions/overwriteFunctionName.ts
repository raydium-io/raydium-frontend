/**
 * @example
 * const origionFn = () => {}
 * overwriteFunctionName(originFn, 'newName') //=> newNameFunction
 */
export default function overwriteFunctionName<F extends (...params: any[]) => any>(func: F, name: string): F {
  const temp = {
    [name]: (...args: any[]) => func(...args)
  }
  return temp[name] as F
}
