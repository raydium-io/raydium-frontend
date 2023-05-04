import { ENDPOINT, MAINNET_PROGRAM_ID, RAYDIUM_MAINNET } from '@raydium-io/raydium-sdk'
import { create } from 'zustand'
import { ApiConfig, ApiOrigin } from './apiUrl.config'

export type AppAdvancedSettingsStore = {
  mode: 'mainnet' | 'devnet'
  programIds: typeof MAINNET_PROGRAM_ID
  readonly apiUrls: {
    [K in keyof ApiConfig]: `${ApiOrigin}/${K}`
  }
  apiUrlOrigin: string
  apiUrlPathnames: typeof RAYDIUM_MAINNET
}

export const useAppAdvancedSettings = create<AppAdvancedSettingsStore>((set, get) => ({
  mode: 'mainnet',
  programIds: MAINNET_PROGRAM_ID,
  get apiUrls() {
    return new Proxy({} as any, {
      get(target, p, receiver) {
        return `${get().apiUrlOrigin}${get().apiUrlPathnames[p]}`
      }
    })
  },
  apiUrlOrigin: ENDPOINT,
  apiUrlPathnames: RAYDIUM_MAINNET
}))

export default useAppAdvancedSettings
