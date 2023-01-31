import { PublicKeyish, SHOW_INFO } from '@raydium-io/raydium-sdk'

import create from 'zustand'

import toPubString from '@/functions/format/toMintString'
import { Numberish } from '@/types/constants'

import { SplToken } from '../token/type'
import { getCreateNewMarketProgramId } from '../token/wellknownProgram.config'
import { HydratedCompensationInfoItem } from './type'

export type NegativeMoney = {
  programId: string
  dataLoaded: boolean
  hydratedCompensationInfoItems?: HydratedCompensationInfoItem[]
  refreshCount: number
  refresh(): void
}

export const useCompensationMoney = create<NegativeMoney>((set) => ({
  programId: toPubString(getCreateNewMarketProgramId()),
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
