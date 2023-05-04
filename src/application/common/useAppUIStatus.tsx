import { create } from 'zustand'

import { Numberish } from '@/types/constants'

// it is some global uiStates

export enum ExplorerName {
  EXPLORER = 'explorer',
  SOLSCAN = 'solscan',
  SOLANAFM = 'solanafm'
}

export enum ExplorerUrl {
  EXPLORER = 'https://explorer.solana.com/',
  SOLSCAN = 'https://solscan.io/',
  SOLANAFM = 'https://solana.fm/'
}

export type AppSettingsStore = {
  themeMode: 'dark' | 'light'

  isBetaBubbleOn: boolean // temp for beta
  needPopDisclaimer: boolean | undefined // need user agree

  /** sould block any update when approve panel shows on  */
  isApprovePanelShown: boolean

  /** (setting) if true, no need to affact coin1 & coin2 & ammId to url  */
  inCleanUrlMode: boolean

  /** (ui panel controller) ui dialog open flag */
  isRecentTransactionDialogShown: boolean

  /** (ui panel controller) ui dialog open flag */
  isWalletSelectorShown: boolean

  // <RefreshCircle/> need a place to store state across app
  refreshCircleLastTimestamp: {
    [key: string]: {
      endProcessPercent: number
      endTimestamp: number
    }
  }

  // rpc performance status
  isLowRpcPerformance: boolean
}
const useAppSettings = create<AppSettingsStore>(() => ({
  themeMode: 'light' as 'dark' | 'light',

  isBetaBubbleOn: true,
  needPopDisclaimer: undefined,

  isMobile: false,
  isTablet: false,
  isPc: true,

  inDev: false,
  isApprovePanelShown: false,

  inCleanUrlMode: false,
  // inCleanUrlMode: true, // for test

  isRecentTransactionDialogShown: false,
  isWalletSelectorShown: false,
  refreshCircleLastTimestamp: {},

  isLowRpcPerformance: false
}))

export default useAppSettings
