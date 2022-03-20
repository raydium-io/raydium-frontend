/**
 *
 * @param uri target
 * @returns shorter string
 * @example
 * getFileNameOfURI('https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/9aPjLUGR9e6w6xU2NEQNtP3jg3mq2mJjSUZoQS4RKz35/dcash-logo.png') //=> 'dcash-logo'
 */

export function getFileNameOfURI(uri: string, { maxLength = 20 } = {}): string {
  const fileName = uri.split(/\//).reverse()[0]
  return fileName.replace(/\.\w+$/, '').slice(0, maxLength)
}
