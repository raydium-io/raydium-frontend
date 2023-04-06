import create from 'zustand'
import { HydratedConcentratedInfo } from '../concentrated/type'

export const useCLMMMigration = create<CLMMMigrationStore>((set, get) => ({
  jsonInfos: [] as CLMMMigrationJSON[],
  shouldLoadedClmmIds: new Set<string>(),
  loadedHydratedClmmInfos: new Map<string, HydratedConcentratedInfo>(),
  refreshCount: 1,
  refresh: () => {
    set((s) => ({ refreshCount: s.refreshCount + 1 }))
  }
}))

type CLMMMigrationStore = {
  jsonInfos: CLMMMigrationJSON[]
  shouldLoadedClmmIds: Set<string>
  loadedHydratedClmmInfos: Map<string, HydratedConcentratedInfo>
  refreshCount: number
  refresh: () => void
}

export type CLMMMigrationJSON = {
  ammId: string
  lpMint: string
  farmIds: string[]
  clmmId: string
  defaultPriceMin: 0.0001
  defaultPriceMax: 1000
}
