import { MAINNET_PROGRAM_ID, RAYDIUM_MAINNET } from '@raydium-io/raydium-sdk'
import { create } from 'zustand'
import { ApiConfig } from './apiUrl.config'
import { getLocalItem } from '@/functions/dom/jStorage'

export const DEFAULT_URL_ENDPOINT = 'https://uapi.raydium.io'
export type AppAdvancedSettingsStore = {
  mode: 'mainnet' | 'devnet'
  programIds: typeof MAINNET_PROGRAM_ID
  readonly apiUrls: {
    [K in keyof ApiConfig]: `https://uapi.raydium.io/${K}`
  }
  apiUrlOrigin: string
  apiUrlPathnames: typeof RAYDIUM_MAINNET
}

export const useAppAdvancedSettings = create<AppAdvancedSettingsStore>((set, get) => ({
  mode: getLocalItem('ADVANCED_SETTINGS_TAB') ?? 'mainnet',
  programIds: MAINNET_PROGRAM_ID,
  get apiUrls() {
    return new Proxy({} as any, {
      get(target, p, receiver) {
        return `${get().apiUrlOrigin}${get().apiUrlPathnames[p]}`
      }
    })
  },
  apiUrlOrigin: getLocalItem('ADVANCED_SETTINGS_ENDPOINT') ?? DEFAULT_URL_ENDPOINT,
  apiUrlPathnames: RAYDIUM_MAINNET
}))

export default useAppAdvancedSettings
