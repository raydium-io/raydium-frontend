import { MAINNET_PROGRAM_ID } from '@raydium-io/raydium-sdk'
import create from 'zustand'
import { ApiConfig, mainnetApiConfig } from './apiUrl.config'

export type AppAdvancedSettingsStore = {
  programIds: typeof MAINNET_PROGRAM_ID
  apiUrls: ApiConfig
}

export const useAppAdvancedSettings = create<AppAdvancedSettingsStore>(() => ({
  programIds: MAINNET_PROGRAM_ID,
  apiUrls: mainnetApiConfig
}))

export default useAppAdvancedSettings
