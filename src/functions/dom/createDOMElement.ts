export function createDOMElement(options: { classNames?: string[]; id?: string }) {
  const newElement = document.createElement('div')
  if (options.classNames) newElement.classList.add(...options.classNames)
  if (options.id) newElement.id = options.id
  return newElement
}
