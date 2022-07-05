export const getScrollParents = (targetElement: HTMLElement): HTMLElement[] =>
  getParents(targetElement).filter(isScrollableElement)

const getParents = (el: HTMLElement): HTMLElement[] => {
  let currentElement = el
  if (!currentElement) return []
  const parents = [] as HTMLElement[]
  while (currentElement.parentElement && currentElement.parentElement !== globalThis.document.body.parentElement) {
    parents.push(currentElement.parentElement)
    currentElement = currentElement.parentElement
  }
  return parents
}

const scrollableElementWeakMap = new WeakMap<HTMLElement, boolean>()

const isScrollableElement = (element: HTMLElement): boolean => {
  if (scrollableElementWeakMap.has(element)) {
    return scrollableElementWeakMap.get(element)!
  } else {
    const isScrollable = isCurrentScrollable(element) || hasScrollableStyle(element)
    scrollableElementWeakMap.set(element, isScrollable)
    return isScrollable
  }
}

const isCurrentScrollable = (el: HTMLElement) => el.clientHeight < el.scrollHeight

const hasScrollableStyle = (el: HTMLElement) => {
  const { overflow, overflowX, overflowY } = globalThis?.getComputedStyle?.(el) ?? {}
  return /auto|scroll|overlay|hidden/.test(overflow + overflowY + overflowX)
}
