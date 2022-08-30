import { inClient } from '@/functions/judgers/isSSR'

export const enum Browser {
  FIREFOX = 'Firefox',
  EDGE_CHROMIUM = 'Edg',
  CHROME = 'Chrome',
  SAFARI = 'Safari',
  OTHER = 'Other',
  IOS = 'iOS',
  ANDROID = 'Android'
}

export function getPlatformInfo() {
  if (!inClient) return
  const ua = navigator.userAgent
  const isAndroid = ua.indexOf('Android') > -1 || ua.indexOf('Adr') > -1
  const isIOS = !!ua.match(/\(i[^;]+;( U;)? CPU.+Mac OS X/)
  const isWechat = ua.indexOf('MicroMessenger') > -1
  const isMacOS = /Mac OS/i.test(ua)
  const isMobile = /(iPhone|iPad|iPod|iOS|Android)/i.test(ua)
  const isPc = !isMobile
  let browserName: Browser
  if (/iPad|iPhone|iPod/.test(ua)) {
    browserName = Browser.IOS
  } else if (/android/i.test(ua)) {
    browserName = Browser.ANDROID
  } else if (ua.includes(Browser.FIREFOX)) {
    // "Mozilla/5.0 (X11; Linux i686; rv:104.0) Gecko/20100101 Firefox/104.0"
    browserName = Browser.FIREFOX
  } else if (ua.includes(Browser.EDGE_CHROMIUM)) {
    // "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Safari/537.36 Edg/104.0.1293.70"
    browserName = Browser.EDGE_CHROMIUM
  } else if (ua.includes(Browser.CHROME)) {
    // "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Safari/537.36"
    browserName = Browser.CHROME
  } else if (ua.includes(Browser.SAFARI)) {
    // "Mozilla/5.0 (iPhone; CPU iPhone OS 15_6_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.6 Mobile/15E148 Safari/604.1"
    browserName = Browser.SAFARI
  } else {
    browserName = Browser.OTHER
  }

  return {
    isAndroid,
    isIOS,
    isWechat,
    isMobile,
    isPc,
    isMacOS,
    browserName
  }
}
