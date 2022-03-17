import { inServer } from '@/functions/judgers/isSSR'

export function forceWindowRefresh() {
  // force refresh without cache
  if (inServer) return
  try {
    // may be browser compact
    // @ts-expect-error force
    globalThis.location.reload(true)
  } catch (err) {
    // eslint-disable-next-line no-console
    console.log('err: ', err)
  }
}
