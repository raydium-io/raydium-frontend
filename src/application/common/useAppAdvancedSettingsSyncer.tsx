import useAppAdvancedSettings from '@/application/common/useAppAdvancedSettings'
import useTwoStateSyncer from '@/hooks/use2StateSyncer'
import useLocalStorageItem from '@/hooks/useLocalStorage'
import { DEVNET_PROGRAM_ID, MAINNET_PROGRAM_ID } from '@raydium-io/raydium-sdk'

export function useAppAdvancedSettingsSyncer() {
  const mode = useAppAdvancedSettings((s) => s.mode)
  const [localStorageAdvancedSettingsTab, setLocalStorageAdvancedSettingsTab] = useLocalStorageItem<
    'mainnet' | 'devnet'
  >('ADVANCED_SETTINGS_TAB', {
    defaultValue: 'mainnet'
  })

  useTwoStateSyncer({
    state1: mode,
    state2: localStorageAdvancedSettingsTab,
    onState1Changed: (mode) => {
      if (!mode) return
      setLocalStorageAdvancedSettingsTab(mode)
    },
    onState2Changed: (mode) => {
      useAppAdvancedSettings.setState({
        mode: mode,
        programIds: mode === 'mainnet' ? MAINNET_PROGRAM_ID : DEVNET_PROGRAM_ID
      })
    }
  })
}
