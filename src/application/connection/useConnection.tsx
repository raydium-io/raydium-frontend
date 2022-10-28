import { Connection } from '@solana/web3.js'

import create from 'zustand'

import { Endpoint } from './type'
import { switchRpc } from './switchRpc'
import { deleteRpc } from './deleteRpc'

export const CONNECT_ERROR_VERSION_TOO_OLD = 'CONNECT_ERROR_VERSION_TOO_OLD'
export const CONNECT_ERROR_NETWORK_ERROR = 'CONNECT_ERROR_NETWORK_ERROR'

export interface ConnectionError {
  type: typeof CONNECT_ERROR_VERSION_TOO_OLD | typeof CONNECT_ERROR_NETWORK_ERROR
  err?: Error | string
  timestamp: number
  details?: Record<string, any>
}

export type ConnectionStore = {
  connection: Connection | undefined
  version?: string | number

  availableEndPoints: Endpoint[]
  availableDevEndPoints?: Endpoint[] // for debug

  // for online chain time is later than UTC
  chainTimeOffset?: number // UTCTime + onlineChainTimeOffset = onLineTime

  /**
   * for ui
   * maybe user customized
   * when isSwitchingRpcConnection it maybe not the currentConnection
   */
  currentEndPoint: Endpoint | undefined

  /** recommanded */
  autoChoosedEndPoint: Endpoint | undefined

  /** for ui loading */
  isLoading: boolean
  switchConnectionFailed: boolean

  userCostomizedUrlText: string
  /**
   * true: success to switch
   * false: fail to switch (connect error)
   * undefined: get result but not target endpoint (maybe user have another choice)
   */
  switchRpc: (endPoint: Endpoint) => Promise<boolean | undefined>
  loadingCustomizedEndPoint?: Endpoint
  /**
   * true: success to switch
   * false: fail to switch (connect error)
   * undefined: get result but not target endpoint (maybe user have another choice)
   */
  deleteRpc: (endPointUrl: Endpoint['url']) => Promise<boolean | undefined>
  getChainDate: () => Date
}
export const LOCALSTORAGE_KEY_USER_RPC = 'USER_RPC'
export const SESSION_STORAGE_USER_SELECTED_RPC = 'user-selected-rpc'
/** zustand store hooks */
export const useConnection = create<ConnectionStore>((set, get) => ({
  connection: undefined,

  availableEndPoints: [],

  currentEndPoint: undefined,
  autoChoosedEndPoint: undefined,

  isLoading: false,
  switchConnectionFailed: false,

  userCostomizedUrlText: 'https://',

  switchRpc,
  deleteRpc,
  getChainDate() {
    return new Date(Date.now() + (get().chainTimeOffset ?? 0))
  }
}))

export default useConnection
