import create from 'zustand'

import toPubString from '@/functions/format/toMintString'
import { createNewMarketPargramId } from '../token/wellknownProgram.config'
import { SplToken } from '../token/type'
import { Numberish } from '@/types/constants'
import { PublicKeyish } from '@raydium-io/raydium-sdk'

export type CreateMarket = {
  programId: string
  baseToken?: SplToken
  quoteToken?: SplToken
  minimumOrderSize: Numberish
  tickSize: Numberish

  newCreatedMarketId?: PublicKeyish
}

export const useCreateMarket = create<CreateMarket>((set) => ({
  programId: toPubString(createNewMarketPargramId),
  minimumOrderSize: 1,
  tickSize: 0.01
}))
