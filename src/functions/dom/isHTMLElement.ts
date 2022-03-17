export default function isHTMLElement(value: any): value is HTMLElement {
  return value !== null && typeof value === 'object' && Boolean((value as { tagName: string }).tagName)
}
