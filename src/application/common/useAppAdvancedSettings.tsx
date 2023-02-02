import { MAINNET_PROGRAM_ID } from '@raydium-io/raydium-sdk'
import create from 'zustand'

export type AppAdvancedSettingsStore = {
  programIds: typeof MAINNET_PROGRAM_ID
}
const useAppAdvancedSettings = create<AppAdvancedSettingsStore>(() => ({
  programIds: MAINNET_PROGRAM_ID
}))

export default useAppAdvancedSettings
