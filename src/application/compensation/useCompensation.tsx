import create from 'zustand'
import { HydratedCompensationInfoItem } from './type'

export type NegativeMoney = {
  dataLoaded: boolean
  hydratedCompensationInfoItems?: HydratedCompensationInfoItem[]
  refreshCount: number
  refresh(): void
}

export const useCompensationMoney = create<NegativeMoney>((set) => ({
  dataLoaded: false,
  refreshCount: 0,
  refresh: () => {
    // will auto refresh wallet
    // refresh sdk parsed
    set((s) => ({
      refreshCount: s.refreshCount + 1
    }))
  }
}))
