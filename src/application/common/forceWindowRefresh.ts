import { inServer } from '@/functions/judgers/isSSR'

export function refreshWindow(options?: { noCache?: boolean }) {
  // force refresh without cache
  if (inServer) return
  try {
    // may be browser compact, dreprecated by HTML5 standard
    // @ts-expect-error force
    globalThis.location.reload(options?.noCache)
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err) //console.log was not allowed by eslint anyway in eslint settings
  }
}
