import create from 'zustand'

import toPubString from '@/functions/format/toMintString'

import { SDK_PROGRAM_IDS } from '../token/wellknownProgram.config'
import { HydratedCompensationInfoItem } from './type'

export type NegativeMoney = {
  programId: string
  dataLoaded: boolean
  hydratedCompensationInfoItems?: HydratedCompensationInfoItem[]
  refreshCount: number
  refresh(): void
}

export const useCompensationMoney = create<NegativeMoney>((set) => ({
  programId: toPubString(SDK_PROGRAM_IDS.OPENBOOK_MARKET),
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
