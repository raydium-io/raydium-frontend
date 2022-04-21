import create from 'zustand'

import { BackendApiIdoListItem, BackendApiIdoProjectDetails, HydratedIdoInfo } from './type'
import { MayArray, Numberish } from '@/types/constants'
import { IdoInfo as SDKIdoInfo } from './sdk'
import { inServer } from '@/functions/judgers/isSSR'

type IdoStoreState = {
  hasDeposited?: boolean // secondary flag, primary use backend data
  hasClaimedBase?: boolean // secondary flag, primary use backend data
  hasClaimedQuote?: boolean // secondary flag, primary use backend data
  ticketAmount?: Numberish
}

type IdoStore = {
  idoHydratedInfos: { [idoid: string]: HydratedIdoInfo }
  shadowIdoHydratedInfos?: { [idoid: string]: { [walletOwner: string]: HydratedIdoInfo } } // for shadowOwners

  idoRawInfos: {
    [idoid: string]: BackendApiIdoListItem
  }
  idoProjectInfos: {
    [idoid: string]: BackendApiIdoProjectDetails
  }
  idoSDKInfos: {
    [idoid: string]: SDKIdoInfo
  }
  shadowIdoSDKInfos?: { [idoid: string]: { [walletOwner: string]: HydratedIdoInfo } } // for shadowOwners

  /** only use it in acceleraytor/lottery page */
  currentIdoId?: string

  currentTab: 'Upcoming Pools' | 'Closed Pools'
  idoState: Record<string, IdoStoreState> // for fast refresh without backend

  // do not care it's value, just trigger React refresh
  idoRefreshFactor?: { count: number; refreshIdoId: MayArray<string> }
  refreshIdo: (idoId?: string) => void
}

const useIdo = create<IdoStore>((set, get) => ({
  idoHydratedInfos: {}, // auto parse info in {@link useLiquidityAuto}

  idoRawInfos: {},
  idoProjectInfos: {},
  idoSDKInfos: {},
  currentTab: 'Closed Pools',

  refreshIdo: (idoId?: string) => {
    if (inServer) return
    setTimeout(() => {
      set((s) => ({
        idoRefreshFactor: {
          count: (s.idoRefreshFactor?.count ?? 0) + 1,
          refreshIdoId: idoId ?? Object.keys(get().idoRawInfos)
        }
      }))
    }, 800) // fot ido info it's immediately change
  },
  idoState: {}
}))

export default useIdo
