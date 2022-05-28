import toPubString from '@/functions/format/toMintString'
import create from 'zustand'
import { RAYMint } from '../token/utils/wellknownToken.config'
import { createNewUIRewardInfo } from './parseRewardInfo'
import { CreateFarmStore } from './type'

const useCreateFarms = create<CreateFarmStore>((set) => ({
  rewards: [{ ...createNewUIRewardInfo(), tokenMint: toPubString(RAYMint) }]
}))

export default useCreateFarms
