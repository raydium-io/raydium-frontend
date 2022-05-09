import create from 'zustand'

export type CreateFarmStore = {
  searchPoolId?: string
}

const useCreateFarms = create<CreateFarmStore>((set) => ({}))

export default useCreateFarms
