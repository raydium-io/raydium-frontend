import { MAINNET_PROGRAM_ID } from '@raydium-io/raydium-sdk'
import create from 'zustand'
import { ApiConfig, mainnetApiConfig } from './apiUrl.config'

export type AppAdvancedSettingsStore = {
  mode: 'mainnet' | 'devnet'
  programIds: typeof MAINNET_PROGRAM_ID
  apiUrls: ApiConfig
}

export const useAppAdvancedSettings = create<AppAdvancedSettingsStore>(() => ({
  mode: 'mainnet',
  programIds: MAINNET_PROGRAM_ID,
  apiUrls: mainnetApiConfig
}))

export default useAppAdvancedSettings
