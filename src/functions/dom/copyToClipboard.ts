export default function copyToClipboard(content: string) {
  if (globalThis?.navigator?.clipboard) {
    // eslint-disable-next-line no-console
    return globalThis.navigator.clipboard.writeText(content).then(() => console.info('Text copied'))
  } else {
    throw new Error('current context has no clipboard')
  }
}
