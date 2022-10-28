import { inServer } from '@/functions/judgers/isSSR'

export function extractRPCName(url: string) {
  const matchedLocalhost = url.match(/(https:\/\/|http:\/\/)?localhost.*/)
  if (matchedLocalhost) return 'localhost'

  if (inServer) return ''
  try {
    const urlObj = new globalThis.URL(url)
    return urlObj.hostname
  } catch {
    return '--'
  }
}
