import create, { GetState, SetState } from 'zustand'
import { StoreApiWithSubscribeWithSelector, subscribeWithSelector } from 'zustand/middleware'

import { BackendApiIdoListItem, BackendApiIdoProjectDetails, HydratedIdoInfo } from './type'
import { Numberish } from '@/types/constants'
import { IdoInfo as SDKIdoInfo } from './sdk'

type IdoStoreState = {
  hasDeposited?: boolean // secondary flag, primary use backend data
  hasClaimedBase?: boolean // secondary flag, primary use backend data
  hasClaimedQuote?: boolean // secondary flag, primary use backend data
  ticketAmount?: Numberish
}

export type IdoStore = {
  idoHydratedInfos: { [idoid: string]: HydratedIdoInfo }
  shadowIdoHydratedInfos?: { [walletOwner: string]: { [idoid: string]: HydratedIdoInfo } } // for shadowOwners

  idoRawInfos: {
    [idoid: string]: BackendApiIdoListItem
  }
  idoProjectInfos: {
    [idoid: string]: BackendApiIdoProjectDetails
  }
  idoSDKInfos: {
    [idoid: string]: SDKIdoInfo
  }

  /** only use it in acceleraytor/lottery page */
  currentIdoId?: string

  currentTab: 'Upcoming Pools' | 'Closed Pools'
  idoState: Record<string, IdoStoreState> // for fast refresh without backend
  setIdoState: (idoId: string, statePiece: Partial<IdoStoreState>) => void

  refreshIdo: (idoId?: string) => void
}

const useIdo = create<IdoStore>((set, get) => ({
  idoHydratedInfos: {}, // auto parse info in {@link useLiquidityAuto}

  idoRawInfos: {},
  idoProjectInfos: {},
  idoSDKInfos: {},
  currentTab: 'Closed Pools',

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
}))

export default useIdo
