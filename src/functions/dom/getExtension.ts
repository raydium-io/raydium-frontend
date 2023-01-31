import { Browser } from './getPlatformInfo'

// autoHandle: some wallet adapter can trigger their own pop out window for wallet instruction

export const extensionMap = {
  Phantom: {
    autoHandle: false,
    [Browser.FIREFOX]: 'https://addons.mozilla.org/en-US/firefox/addon/phantom-app/',
    [Browser.EDGE_CHROMIUM]: 'https://chrome.google.com/webstore/detail/phantom/bfnaelmomeimhlpmgjnjophhpkkoljpa',
    [Browser.CHROME]: 'https://chrome.google.com/webstore/detail/phantom/bfnaelmomeimhlpmgjnjophhpkkoljpa',
    [Browser.SAFARI]: '',
    [Browser.OTHER]: '',
    [Browser.IOS]: 'https://apps.apple.com/app/phantom-solana-wallet/1598432977',
    [Browser.ANDROID]: 'https://play.google.com/store/apps/details?id=app.phantom'
  },
  Trust: {
    autoHandle: false,
    [Browser.FIREFOX]: '',
    [Browser.EDGE_CHROMIUM]: '',
    [Browser.CHROME]: '',
    [Browser.SAFARI]: '',
    [Browser.OTHER]: '',
    [Browser.IOS]: 'https://apps.apple.com/app/apple-store/id1288339409?mt=8',
    [Browser.ANDROID]:
      'https://play.google.com/store/apps/details?id=com.wallet.crypto.trustapp&referrer=utm_source%3Dwebsite'
  },
  Solflare: {
    autoHandle: true,
    [Browser.FIREFOX]: 'https://addons.mozilla.org/en-GB/firefox/addon/solflare-wallet/',
    [Browser.EDGE_CHROMIUM]:
      'https://chrome.google.com/webstore/detail/solflare-wallet/bhhhlbepdkbapadjdnnojkbgioiodbic',
    [Browser.CHROME]: 'https://chrome.google.com/webstore/detail/solflare-wallet/bhhhlbepdkbapadjdnnojkbgioiodbic',
    [Browser.SAFARI]: '',
    [Browser.OTHER]: '',
    [Browser.IOS]: 'https://solflare.com/download#iphone',
    [Browser.ANDROID]: 'https://solflare.com/download#android'
  },
  Sollet: {
    autoHandle: true,
    [Browser.FIREFOX]: '',
    [Browser.EDGE_CHROMIUM]: '',
    [Browser.CHROME]: '',
    [Browser.SAFARI]: '',
    [Browser.OTHER]: '',
    [Browser.IOS]: '',
    [Browser.ANDROID]: ''
  },
  Torus: {
    autoHandle: true,
    [Browser.FIREFOX]: '',
    [Browser.EDGE_CHROMIUM]: '',
    [Browser.CHROME]: '',
    [Browser.SAFARI]: '',
    [Browser.OTHER]: '',
    [Browser.IOS]: '',
    [Browser.ANDROID]: ''
  },
  Ledger: {
    autoHandle: true,
    [Browser.FIREFOX]: '',
    [Browser.EDGE_CHROMIUM]: '',
    [Browser.CHROME]: '',
    [Browser.SAFARI]: '',
    [Browser.OTHER]: '',
    [Browser.IOS]: '',
    [Browser.ANDROID]: ''
  },
  'Sollet (Extension)': {
    autoHandle: false,
    [Browser.FIREFOX]: '',
    [Browser.EDGE_CHROMIUM]: 'https://chrome.google.com/webstore/detail/sollet/fhmfendgdocmcbmfikdcogofphimnkno?hl=en',
    [Browser.CHROME]: 'https://chrome.google.com/webstore/detail/sollet/fhmfendgdocmcbmfikdcogofphimnkno?hl=en',
    [Browser.SAFARI]: '',
    [Browser.OTHER]: '',
    [Browser.IOS]: '',
    [Browser.ANDROID]: ''
  },
  MathWallet: {
    autoHandle: false,
    [Browser.FIREFOX]: '',
    [Browser.EDGE_CHROMIUM]:
      'https://microsoftedge.microsoft.com/addons/detail/math-wallet/dfeccadlilpndjjohbjdblepmjeahlmm',
    [Browser.CHROME]: 'https://chrome.google.com/webstore/detail/math-wallet/afbcbjpbpfadlkmhmclhkeeodmamcflc',
    [Browser.SAFARI]: '',
    [Browser.OTHER]: '',
    [Browser.IOS]: 'https://apps.apple.com/tw/app/mathwallet-web3-wallet/id1582612388',
    [Browser.ANDROID]: 'https://play.google.com/store/apps/details?id=com.mathwallet.android'
  },
  TokenPocket: {
    autoHandle: false,
    [Browser.FIREFOX]: '',
    [Browser.EDGE_CHROMIUM]:
      'https://chrome.google.com/webstore/detail/tokenpocket/mfgccjchihfkkindfppnaooecgfneiii?hl=en',
    [Browser.CHROME]: 'https://chrome.google.com/webstore/detail/tokenpocket/mfgccjchihfkkindfppnaooecgfneiii?hl=en',
    [Browser.SAFARI]: '',
    [Browser.OTHER]: '',
    [Browser.IOS]: 'https://apps.apple.com/tw/app/tokenpocket-crypto-defi-wallet/id1436028697?l=en',
    [Browser.ANDROID]: 'https://play.google.com/store/apps/details?id=vip.mytokenpocket'
  },
  'Coinbase Wallet': {
    autoHandle: false,
    [Browser.FIREFOX]: '',
    [Browser.EDGE_CHROMIUM]:
      'https://chrome.google.com/webstore/detail/coinbase-wallet-extension/hnfanknocfeofbddgcijnmhnfnkdnaad?hl=en',
    [Browser.CHROME]:
      'https://chrome.google.com/webstore/detail/coinbase-wallet-extension/hnfanknocfeofbddgcijnmhnfnkdnaad?hl=en',
    [Browser.SAFARI]: '',
    [Browser.OTHER]: '',
    [Browser.IOS]:
      'https://apps.apple.com/tw/app/coinbase-wallet-%E5%84%B2%E5%AD%98%E4%BD%A0%E7%9A%84%E5%8A%A0%E5%AF%86%E8%B2%A8%E5%B9%A3/id1278383455',
    [Browser.ANDROID]: 'https://play.google.com/store/apps/details?id=org.toshi'
  },
  Solong: {
    autoHandle: false,
    [Browser.FIREFOX]: '',
    [Browser.EDGE_CHROMIUM]: 'https://chrome.google.com/webstore/detail/solong/memijejgibaodndkimcclfapfladdchj',
    [Browser.CHROME]: 'https://chrome.google.com/webstore/detail/solong/memijejgibaodndkimcclfapfladdchj',
    [Browser.SAFARI]: '',
    [Browser.OTHER]: '',
    [Browser.IOS]: '',
    [Browser.ANDROID]: ''
  },
  Coin98: {
    autoHandle: false,
    [Browser.FIREFOX]: '',
    [Browser.EDGE_CHROMIUM]: '',
    [Browser.CHROME]: 'https://chrome.google.com/webstore/detail/coin98-wallet/aeachknmefphepccionboohckonoeemg',
    [Browser.SAFARI]: '',
    [Browser.OTHER]: '',
    [Browser.IOS]: 'https://ios.coin98.com/',
    [Browser.ANDROID]: 'http://android.coin98.com/'
  },
  SafePal: {
    autoHandle: false,
    [Browser.FIREFOX]: 'https://addons.mozilla.org/en-US/firefox/addon/safepal-extension-wallet/',
    [Browser.EDGE_CHROMIUM]:
      'https://microsoftedge.microsoft.com/addons/detail/safepal-extension-wallet/apenkfbbpmhihehmihndmmcdanacolnh',
    [Browser.CHROME]:
      'https://chrome.google.com/webstore/detail/safepal-extension-wallet/lgmpcpglpngdoalbgeoldeajfclnhafa',
    [Browser.SAFARI]: '',
    [Browser.OTHER]: '',
    [Browser.IOS]: 'https://www.safepal.com/download/appstore',
    [Browser.ANDROID]: 'https://play.google.com/store/apps/details?id=io.safepal.wallet'
  },
  Slope: {
    autoHandle: false,
    [Browser.FIREFOX]: '',
    [Browser.EDGE_CHROMIUM]: 'https://chrome.google.com/webstore/detail/slope-wallet/pocmplpaccanhmnllbbkpgfliimjljgo',
    [Browser.CHROME]: 'https://chrome.google.com/webstore/detail/slope-wallet/pocmplpaccanhmnllbbkpgfliimjljgo',
    [Browser.SAFARI]: '',
    [Browser.OTHER]: '',
    [Browser.IOS]: 'https://apps.apple.com/us/app/slope-wallet/id1574624530',
    [Browser.ANDROID]: 'https://play.google.com/store/apps/details?id=com.wd.wallet'
  },
  Bitpie: {
    autoHandle: false,
    [Browser.FIREFOX]: '',
    [Browser.EDGE_CHROMIUM]: '',
    [Browser.CHROME]: '',
    [Browser.SAFARI]: '',
    [Browser.OTHER]: '',
    [Browser.IOS]: 'https://apps.apple.com/us/app/bitpie-wallet/id1481314229',
    [Browser.ANDROID]: 'https://bitpie.com/android/'
  },
  Glow: {
    autoHandle: false,
    [Browser.FIREFOX]: '',
    [Browser.EDGE_CHROMIUM]:
      'https://chrome.google.com/webstore/detail/glow-solana-wallet-beta/ojbcfhjmpigfobfclfflafhblgemeidi?hl=en&authuser=0',
    [Browser.CHROME]:
      'https://chrome.google.com/webstore/detail/glow-solana-wallet-beta/ojbcfhjmpigfobfclfflafhblgemeidi?hl=en&authuser=0',
    [Browser.SAFARI]: '',
    [Browser.OTHER]: '',
    [Browser.IOS]: 'https://apps.apple.com/tw/app/glow-solana-wallet/id1599584512',
    [Browser.ANDROID]: ''
  },
  BitKeep: {
    autoHandle: false,
    [Browser.FIREFOX]: '',
    [Browser.EDGE_CHROMIUM]:
      'https://chrome.google.com/webstore/detail/bitkeep-bitcoin-crypto-wa/jiidiaalihmmhddjgbnbgdfflelocpak',
    [Browser.CHROME]:
      'https://chrome.google.com/webstore/detail/bitkeep-bitcoin-crypto-wa/jiidiaalihmmhddjgbnbgdfflelocpak',
    [Browser.SAFARI]: '',
    [Browser.OTHER]: '',
    [Browser.IOS]: 'https://apps.apple.com/app/bitkeep/id1395301115',
    [Browser.ANDROID]: 'https://play.google.com/store/apps/details?id=com.bitkeep.wallet'
  },
  Exodus: {
    autoHandle: false,
    [Browser.FIREFOX]: '',
    [Browser.EDGE_CHROMIUM]:
      'https://chrome.google.com/webstore/detail/exodus-web3-wallet/aholpfdialjgjfhomihkjbmgjidlcdno',
    [Browser.CHROME]: 'https://chrome.google.com/webstore/detail/exodus-web3-wallet/aholpfdialjgjfhomihkjbmgjidlcdno',
    [Browser.SAFARI]: '',
    [Browser.OTHER]: '',
    [Browser.IOS]: 'https://apps.apple.com/app/apple-store/id1414384820?pt=118366236&ct=download&mt=8',
    [Browser.ANDROID]: 'https://play.google.com/store/apps/details?id=exodusmovement.exodus'
  },
  Clover: {
    autoHandle: false,
    [Browser.FIREFOX]: '',
    [Browser.EDGE_CHROMIUM]: 'https://chrome.google.com/webstore/detail/clv-wallet/nhnkbkgjikgcigadomkphalanndcapjk',
    [Browser.CHROME]: 'https://chrome.google.com/webstore/detail/clv-wallet/nhnkbkgjikgcigadomkphalanndcapjk',
    [Browser.SAFARI]: '',
    [Browser.OTHER]: '',
    [Browser.IOS]: 'https://apps.apple.com/app/clover-wallet/id1570072858',
    [Browser.ANDROID]: 'https://clv.org/'
  },
  Coinhub: {
    autoHandle: false,
    [Browser.FIREFOX]: '',
    [Browser.EDGE_CHROMIUM]: 'https://chrome.google.com/webstore/detail/coinhub/jgaaimajipbpdogpdglhaphldakikgef',
    [Browser.CHROME]: 'https://chrome.google.com/webstore/detail/coinhub/jgaaimajipbpdogpdglhaphldakikgef',
    [Browser.SAFARI]: '',
    [Browser.OTHER]: '',
    [Browser.IOS]: 'https://apps.apple.com/us/app/coinhub/id1567786851',
    [Browser.ANDROID]: 'https://play.google.com/store/apps/details?id=com.coinhub.wallet'
  },
  Backpack: {
    autoHandle: false,
    [Browser.FIREFOX]: '',
    [Browser.EDGE_CHROMIUM]: '',
    [Browser.CHROME]: '',
    [Browser.SAFARI]: '',
    [Browser.OTHER]: '',
    [Browser.IOS]: '',
    [Browser.ANDROID]: ''
  },
  WalletConnect: {
    autoHandle: true,
    [Browser.FIREFOX]: '',
    [Browser.EDGE_CHROMIUM]: '',
    [Browser.CHROME]: '',
    [Browser.SAFARI]: '',
    [Browser.OTHER]: '',
    [Browser.IOS]: '',
    [Browser.ANDROID]: ''
  },
  Brave: {
    autoHandle: false,
    [Browser.FIREFOX]: '',
    [Browser.EDGE_CHROMIUM]: '',
    [Browser.CHROME]: '',
    [Browser.SAFARI]: '',
    [Browser.OTHER]: '',
    [Browser.IOS]: '',
    [Browser.ANDROID]: ''
  }
}
