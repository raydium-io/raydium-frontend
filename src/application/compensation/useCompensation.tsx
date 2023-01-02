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
  showInfos?: HydratedCompensationInfoItem[]
}

export const useCompensationMoney = create<NegativeMoney>((set) => ({
  programId: toPubString(getCreateNewMarketProgramId()),
  dataLoaded: false
}))
