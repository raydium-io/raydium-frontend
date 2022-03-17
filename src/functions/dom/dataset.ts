import { Stringish } from '@/types/constants'

/**
 *
 * @param el
 * @param propertyName
 * @param value
 * @example
 * setDateSet(document.getElementById('he'), 'isActive', true)
 */
export function setDataSet(
  el: HTMLElement | undefined | null,
  propertyName: string | undefined,
  value: Stringish
): void {
  if (el && propertyName) {
    el.dataset[propertyName] = String(value)
  }
}
