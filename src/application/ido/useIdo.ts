import create, { GetState, SetState } from 'zustand'
import { StoreApiWithSubscribeWithSelector, subscribeWithSelector } from 'zustand/middleware'

import assert from '@/functions/assert'

import useConnection from '../connection/useConnection'
import useWallet from '../wallet/useWallet'
import txIdoClaim from './utils/txIdoClaim'
import txIdoPurchase from './utils/txIdoPurchase'
import { IdoBannerInformations, HydratedIdoInfo } from './type'
import { Numberish } from '@/types/constants'

type IdoState = {
  hasDeposited?: boolean // secondary flag, primary use backend data
  hasClaimedBase?: boolean // secondary flag, primary use backend data
  hasClaimedQuote?: boolean // secondary flag, primary use backend data
  ticketAmount?: Numberish
}

type IdoStore = {
  idoBannerInformations: IdoBannerInformations | undefined
  idoHydratedInfos: { [idoid: string]: HydratedIdoInfo }
  shadowIdoHydratedInfos?: { [idoid: string]: { [walletOwner: string]: HydratedIdoInfo } } // for shadowOwners

  currentTab: 'All' | 'Inactive'
  idoState: Record<string, IdoState>
  setIdoState: (idoId: string, statePiece: Partial<IdoState>) => void

  purchase: (
    options: Omit<Parameters<typeof txIdoPurchase>[0], 'connection' | 'walletAdapter' | 'tokenAccounts'>
  ) => Promise<void>
  claim: (
    options: Omit<Parameters<typeof txIdoClaim>[0], 'connection' | 'walletAdapter' | 'tokenAccounts'>
  ) => Promise<void>

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
        },

        //TODO: tedious, delete it
        purchase: async (options) => {
          txIdoPurchase(options)
          return Promise.resolve(undefined)
        },

        //TODO: tedious, delete it
        claim: (options) => {
          const { connection } = useConnection.getState()
          const { adapter: walletAdapter, tokenAccounts } = useWallet.getState()

          assert(connection, 'claim(ido): no rpc connection')
          assert(walletAdapter, 'claim(ido): no wallet adapter')
          return txIdoClaim({ ...options, connection, walletAdapter, tokenAccounts })
        }
      } as IdoStore)
  )
)

export default useIdo
