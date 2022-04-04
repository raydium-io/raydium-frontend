import create, { GetState, SetState } from 'zustand'
import { StoreApiWithSubscribeWithSelector, subscribeWithSelector } from 'zustand/middleware'

import { IdoBannerInformations, HydratedIdoInfo } from './type'
import { Numberish } from '@/types/constants'

type IdoState = {
  hasDeposited?: boolean // secondary flag, primary use backend data
  hasClaimedBase?: boolean // secondary flag, primary use backend data
  hasClaimedQuote?: boolean // secondary flag, primary use backend data
  ticketAmount?: Numberish
}

type IdoStore = {
  idoHydratedInfos: { [idoid: string]: HydratedIdoInfo }
  shadowIdoHydratedInfos?: { [idoid: string]: { [walletOwner: string]: HydratedIdoInfo } } // for shadowOwners

  /** only use it in acceleraytor/lottery page */
  currentIdoId?: string

  idoBannerInformations: IdoBannerInformations | undefined
  currentTab: 'All' | 'Inactive'
  idoState: Record<string, IdoState> // for fast refresh without backend
  setIdoState: (idoId: string, statePiece: Partial<IdoState>) => void

  refreshIdo: (idoId?: string) => void
}

const useIdo = create<IdoStore, SetState<IdoStore>, GetState<IdoStore>, StoreApiWithSubscribeWithSelector<IdoStore>>(
  subscribeWithSelector(
    (set, get) =>
      ({
        idoBannerInformations: undefined,
        idoHydratedInfos: {}, // auto parse info in {@link useLiquidityAuto}

        currentTab: 'All',

        refreshIdo: (idoId?: string) => Promise.resolve(undefined),
        idoState: {},
        setIdoState: (idoId, statePiece) => {
          set((s) => ({
            idoState: {
              ...s.idoState,
              [idoId]: {
                ...s[idoId],
                ...statePiece
              }
            }
          }))
        }
      } as IdoStore)
  )
)

export default useIdo
