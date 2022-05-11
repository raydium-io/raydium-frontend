import { Numberish } from '@/types/constants'
import { SplTokens } from '@raydium-io/raydium-sdk'
import create from 'zustand'
import { SplToken } from '../token/type'

export type CreateFarmStore = {
  searchPoolId?: string
  rewards: {
    token?: SplToken
    amount?: Numberish
    startTime?: Date
    endTime?: Date
  }[]
}

const useCreateFarms = create<CreateFarmStore>((set) => ({
  rewards: [{}]
}))

export default useCreateFarms
