import { Nullish, Stringish } from '@/types/constants'

import { toKebabCase } from '../changeCase'
import fall from '../fall'
import { shrinkToValue } from '../shrinkToValue'

type GlobalCssVariable = '--side-menu-width' | '--topbar-height'

export const registCSSVariable = (cssvariableName: GlobalCssVariable, value: string | number) =>
  document.documentElement.style.setProperty(cssvariableName, String(value))

export const getCSSVariable = (
  cssVariableName: GlobalCssVariable,
  options?: {
    unit?: 'px'
    /** @example 'calc($0 / 2)' */
    calcStr?: string
  }
) => {
  return fall(cssVariableName, [
    (name) => (options?.unit ? `calc(var(${name}) * 1${options.unit})` : `var(${name})`),
    (united) => (options?.calcStr ? options.calcStr.replace('$0', united) : united)
  ])
}

/**
 *
 * @param el
 * @param variableName css variable name (kebab case)
 * @param value (will be wrapped by `String()`)
 * @example
 * setCssVarible(document.getElementById('he'), '--is-active', true)
 */
export function setCssVarible(
  el: HTMLElement | Nullish,
  variableName: string | undefined,
  value: Stringish | ((prev: string) => Stringish)
): void {
  if (el && variableName) {
    el.style.setProperty(variableName, String(shrinkToValue(value, [el.style.getPropertyValue(variableName)])))
  }
}

/**
 *
 * @param el
 * @param variableName css variable name (kebab case)
 * @example
 * getCssVariable(document.getElementById('he'), '--is-active')
 */
export function getCssVariable(el: HTMLElement | Nullish, variableName: string | undefined): string {
  if (el && variableName) {
    return el.style.getPropertyValue(variableName)
  }
  return ''
}
