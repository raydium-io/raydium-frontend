import { Connection } from '@solana/web3.js'

import create from 'zustand'

import assert from '@/functions/assert'

import useNotification from '../notification/useNotification'

import { Endpoint, UserCustomizedEndpoint } from './fetchRPCConfig'
import { setLocalItem } from '@/functions/dom/jStorage'
import { inServer } from '@/functions/judgers/isSSR'
import { unifyByKey } from '@/functions/arrayMethods'

export const CONNECT_ERROR_VERSION_TOO_OLD = 'CONNECT_ERROR_VERSION_TOO_OLD'
export const CONNECT_ERROR_NETWORK_ERROR = 'CONNECT_ERROR_NETWORK_ERROR'

export interface ConnectionError {
  type: typeof CONNECT_ERROR_VERSION_TOO_OLD | typeof CONNECT_ERROR_NETWORK_ERROR
  err?: Error | string
  timestamp: number
  details?: Record<string, any>
}

type ConnectionStore = {
  connection: Connection | undefined
  version?: string | number

  availableEndPoints: Endpoint[]

  chainTimeOffset?: number
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

  extractConnectionName: (url: string) => string
  getChainDate: () => Date
}
export const LOCALSTORAGE_KEY_USER_RPC = 'USER_RPC'
/** zustand store hooks */
const useConnection = create<ConnectionStore>((set, get) => ({
  connection: undefined,

  availableEndPoints: [],

  currentEndPoint: undefined,
  autoChoosedEndPoint: undefined,

  isLoading: false,
  switchConnectionFailed: false,

  userCostomizedUrlText: 'https://',

  switchRpc: async (customizedEndPoint) => {
    try {
      if (!customizedEndPoint.url.replace(/.*:\/\//, '')) return
      // set loading
      set({ isLoading: true, loadingCustomizedEndPoint: customizedEndPoint })

      const response = await fetch(customizedEndPoint.url, {
        headers: {
          'content-type': 'application/json'
        },
        method: 'POST',
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getEpochInfo' })
      })
      assert(response.ok)
      const newConnection = new Connection(customizedEndPoint.url, 'confirmed')
      set({ connection: newConnection, currentEndPoint: customizedEndPoint, switchConnectionFailed: false })

      const { currentEndPoint } = get()
      if (currentEndPoint === customizedEndPoint) {
        const rpcName = customizedEndPoint.name ?? get().extractConnectionName(customizedEndPoint.url)
        const newEndPoint = { ...customizedEndPoint, name: rpcName }
        // cancel loading status
        set({ isLoading: false, switchConnectionFailed: false })

        const { logSuccess } = useNotification.getState()
        logSuccess('RPC Switch Success ', `new rpc: ${newEndPoint.name}`)

        const isUserAdded = !get()
          .availableEndPoints.map((i) => i.url)
          .includes(newEndPoint.url)

        if (isUserAdded) {
          setLocalItem(LOCALSTORAGE_KEY_USER_RPC, (v) =>
            unifyByKey(
              [{ ...newEndPoint, isUserCustomized: true } as UserCustomizedEndpoint, ...(v ?? [])],
              (i) => i.url
            )
          )
        }

        set((s) => {
          const unified = unifyByKey(
            [...(s.availableEndPoints ?? []), { ...newEndPoint, isUserCustomized: true } as UserCustomizedEndpoint],
            (i) => i.url
          )
          return {
            currentEndPoint: newEndPoint,
            availableEndPoints: unified
          }
        })

        return true
      }
      return undefined
    } catch {
      const { currentEndPoint } = get()
      // cancel loading status
      set({ isLoading: false, loadingCustomizedEndPoint: undefined, switchConnectionFailed: true })
      const { logError } = useNotification.getState()
      logError('RPC Switch Failed')
      return false
    }
  },
  deleteRpc: async (endPointUrl) => {
    setLocalItem(LOCALSTORAGE_KEY_USER_RPC, (v: UserCustomizedEndpoint[] | undefined) =>
      (v ?? []).filter((i) => i.url !== endPointUrl)
    )
    set({
      availableEndPoints: (get()?.availableEndPoints ?? []).filter((i) => i.url !== endPointUrl)
    })
    return true
  },

  extractConnectionName: (url: string) => {
    const matchedLocalhost = url.match(/(https:\/\/|http:\/\/)?localhost.*/)
    if (matchedLocalhost) return 'localhost'

    if (inServer) return ''
    try {
      const urlObj = new globalThis.URL(url)
      return urlObj.hostname
    } catch {
      return '--'
    }
  },

  getChainDate() {
    return new Date(Date.now() + (get().chainTimeOffset ?? 0))
  }
}))

export default useConnection
