import { LiquidityAssociatedPoolKeysV4 } from 'test-r-sdk'
import create from 'zustand'

import { CreatedPoolRecordLocalStorage, ProcessingCreatedPool } from './type'

export type CreatePoolStore = {
  createdPoolHistory: CreatedPoolRecordLocalStorage
  sdkAssociatedPoolKeys: LiquidityAssociatedPoolKeysV4 | undefined
  baseDecimaledAmount: string // in UI, so is  decimaled
  quoteDecimaledAmount: string // in UI, so is  decimaled
  currentStep: number /** only 1, 2, 3 */
  setCurrentStep: (newStep: number) => void
  startTime?: Date
} & Partial<ProcessingCreatedPool>

//* FAQ: why no setJsonInfos, setSdkParsedInfos and setHydratedInfos? because they are not very necessary, just use zustand`set` and zustand`useCreatePool.setState()` is enough
const useCreatePool = create<CreatePoolStore>((set, get) => ({
  createdPoolHistory: {},
  baseDecimaledAmount: '',
  quoteDecimaledAmount: '',
  sdkAssociatedPoolKeys: undefined, // stored sdk parsed infos
  currentStep: 1,
  setCurrentStep: (newStep) => {
    set({ currentStep: newStep })
  }
}))

export default useCreatePool
