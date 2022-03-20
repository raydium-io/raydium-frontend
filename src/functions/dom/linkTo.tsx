import { LinkAddress } from '@/types/constants'

/**
 * very simular to window.open, but use new Tab instead of new window
 */
export default function linkTo(href: LinkAddress) {
  if (!('document' in globalThis)) return
  Object.assign(globalThis.document.createElement('a'), {
    target: '_blank',
    href,
    rel: 'nofollow noopener noreferrer'
  }).click()
}
