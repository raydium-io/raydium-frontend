export default function isClientSide() {
  return 'document' in globalThis && 'window' in globalThis && 'history' in globalThis
}
export function isServerSide() {
  return !isClientSide()
}

export const inClient = isClientSide()

export const inServer = isServerSide()

export const isInLocalhost = inClient && globalThis.location.hostname === 'localhost'
export const isInBonsaiTest = inClient && /bonsai-.*\.vercel\.app/.test(globalThis.location.hostname)
