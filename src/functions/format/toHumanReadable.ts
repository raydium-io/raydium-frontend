import { isDate } from '../date/judges'
import { isArray, isNumberish, isObject, isPrimitive, isPubKey } from '../judgers/dateType'
import { toString } from '../numberish/toString'
import { objectMap } from '../objectMethods'
import toPubString from './toMintString'

/** for debug easier and faster */
export function toHumanReadable(source: unknown, maxDepth = 10 /** to avoid too deep */) {
  if (!maxDepth) return source // if no depth left (0 depth), just return

  if (isDate(source)) return source
  if (isPrimitive(source)) return source
  if (isPubKey(source)) return toPubString(source)
  if (isNumberish(source)) return toString(source)
  if (isArray(source)) return source.map((piece) => toHumanReadable(piece, maxDepth - 1))
  if (isObject(source)) return objectMap(source, (v) => toHumanReadable(v, maxDepth - 1))

  return source
}
