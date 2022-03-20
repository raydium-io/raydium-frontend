/**
 * !
 * it's the core function to make a hook be an attachment
 * very very important for attach mode.
 */
import { MutableRefObject } from 'react'

type RefedHook<T extends HTMLElement, H extends (...any: any[]) => any> = H extends (
  _: any,
  ...rest: infer R
) => unknown
  ? (...params: R) => MutableRefObject<T>
  : never

/**
 * make a hook return ref. (It make the hook more declaretive)
 */
export default function createAttachment<
  T extends HTMLElement,
  H extends (ref: MutableRefObject<any>, ...any: any[]) => any
>(hook: H): RefedHook<T, H> {
  const wrappedHook = (...params: any[]) => {
    const ref = {
      set current(el: any) {
        hook({ current: el }, ...params)
      }
    }
    return ref
  }
  //@ts-expect-error pretend it's the same hook
  return wrappedHook
}
