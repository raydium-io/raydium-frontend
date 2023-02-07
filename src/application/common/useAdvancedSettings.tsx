import create from 'zustand'

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
  slippageTolerance: Numberish
  slippageToleranceState: 'valid' | 'invalid' | 'too small'
  // default explorer's name and URL
  explorerName: string
  explorerUrl: string
}
const useAppSettings = create<AppSettingsStore>(() => ({
  slippageTolerance: 0,
  slippageToleranceState: 'valid',
  explorerName: '',
  explorerUrl: ''
}))

export default useAppSettings
