import { inClient } from '@/functions/judgers/isSSR'

export function getPlatformInfo() {
  if (!inClient) return
  const ua = navigator.userAgent
  const isAndroid = ua.indexOf('Android') > -1 || ua.indexOf('Adr') > -1
  const isIOS = !!ua.match(/\(i[^;]+;( U;)? CPU.+Mac OS X/)
  const isWechat = ua.indexOf('MicroMessenger') > -1
  const isMacOS = /Mac OS/i.test(ua)
  const isMobile = /(iPhone|iPad|iPod|iOS|Android)/i.test(ua)
  const isPc = !isMobile

  return {
    isAndroid,
    isIOS,
    isWechat,
    isMobile,
    isPc,
    isMacOS
  }
}
