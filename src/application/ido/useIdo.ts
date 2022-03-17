import create, { GetState, SetState } from 'zustand'
import { StoreApiWithSubscribeWithSelector, subscribeWithSelector } from 'zustand/middleware'

import assert from '@/functions/assert'
import listToMap from '@/functions/format/listToMap'

import useConnection from '../connection/useConnection'
import useWallet from '../wallet/useWallet'
import { IdoStore } from './type'
import { fetchIdoDetail } from './utils/fetchIdoInfo'
import claim from './utils/txClaim'
import purchase from './utils/txPurchase'

const useIdo = create<IdoStore, SetState<IdoStore>, GetState<IdoStore>, StoreApiWithSubscribeWithSelector<IdoStore>>(
  subscribeWithSelector(
    (set, get) =>
      ({
        idoBannerInformations: undefined,
        idoHydratedInfos: [], // auto parse info in {@link useLiquidityAuto}

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
        purchase: (options) => {
          const { connection } = useConnection.getState()
          const { adapter: walletAdapter, tokenAccounts } = useWallet.getState()

          assert(connection, 'purchase(ido): no rpc connection')
          assert(walletAdapter, 'purchase(ido): no wallet adapter')
          return purchase({ ...options, connection, walletAdapter, tokenAccounts })
        },

        claim: (options) => {
          const { connection } = useConnection.getState()
          const { adapter: walletAdapter, tokenAccounts } = useWallet.getState()

          assert(connection, 'claim(ido): no rpc connection')
          assert(walletAdapter, 'claim(ido): no wallet adapter')
          return claim({ ...options, connection, walletAdapter, tokenAccounts })
        },

        fetchIdoDetail: async (options) => {
          const { connection } = useConnection.getState()
          const { adapter: walletAdapter } = useWallet.getState()

          assert(connection, 'fetchIdoDetail: no rpc connection')

          const hydratedIdoDetailInfo = await fetchIdoDetail({ ...options, connection, walletAdapter })
          if (!hydratedIdoDetailInfo) return

          set((s) => {
            const oldList = s.idoHydratedInfos
            const newMap = { ...listToMap(oldList, (i) => i.id), [hydratedIdoDetailInfo.id]: hydratedIdoDetailInfo }
            return { idoHydratedInfos: Object.values(newMap) }
          })
        }
      } as IdoStore)
  )
)

// useIdo.subscribe(
//   (s) => s.idoHydratedInfos,
//   () => {}
// )

export default useIdo
