import { useEffect } from 'react'

import { Connection } from '@solana/web3.js'

import { unifyByKey } from '@/functions/arrayMethods'
import jFetch from '@/functions/dom/jFetch'
import { getSessionItem } from '@/functions/dom/jStorage'

import useAppSettings from '../common/useAppSettings'

import caculateEndpointUrlByRpcConfig from './caculateEndpointUrlByRpcConfig'
import { Config, Endpoint } from './type'
import useConnection, { SESSION_STORAGE_USER_SELECTED_RPC } from './useConnection'
import useAppAdvancedSettings from '../common/useAppAdvancedSettings'

const mockRPCConfig: Omit<Config, 'success'> = {
  rpcs: [],
  devrpcs: [{ name: 'devnet', url: 'https://api.devnet.solana.com/', net: 'devnet' }],
  strategy: 'speed'
}

export const rewriteConnection = (connection: Connection) => {
  const newConnection = connection as Connection & {
    disableTime: number
    checkDisabled: () => void
    _rpcRequest: any
    _rpcBatchRequest: any
  }
  const [oldRpcRequest, oldRpcBatchRequest] = [newConnection._rpcRequest, newConnection._rpcBatchRequest]
  newConnection._rpcRequest = async (...props) => {
    newConnection.checkDisabled()
    return oldRpcRequest.call(newConnection, ...props).catch((e) => {
      if (e.message.includes('429')) newConnection.disableTime = Date.now() + 1000 * 30
    })
  }
  newConnection._rpcBatchRequest = async (...props) => {
    newConnection.checkDisabled()
    return oldRpcBatchRequest.call(newConnection, ...props).catch((e) => {
      if (e.message.includes('429')) newConnection.disableTime = Date.now() + 1000 * 30
    })
  }
  newConnection.disableTime = Date.now() + 30 * 1000
  newConnection.checkDisabled = () => {
    if (Date.now() < newConnection.disableTime)
      throw new Error(`rate limit reached, disabled until: ${new Date(newConnection.disableTime).toLocaleTimeString()}`)
  }

  return newConnection
}

/**
 * **only in `_app.tsx`**
 *
 * will base on rpcpools(in dev mode) to establish connection
 */
export default function useConnectionInitialization() {
  const rpcsUrl = useAppAdvancedSettings((s) => s.apiUrls.rpcs)
  useEffect(() => {
    useConnection.setState({ isLoading: true })
    jFetch<Config>(rpcsUrl)
      .then(async (data) => {
        if (!data) return

        // dev test
        if (!globalThis.location.host.includes('raydium.io')) {
          Reflect.set(data, 'rpcs', mockRPCConfig.rpcs)
          Reflect.set(data, 'devrpcs', mockRPCConfig.devrpcs)
          Reflect.set(data, 'strategy', mockRPCConfig.strategy)
        }

        const selectedEndpointUrl = await caculateEndpointUrlByRpcConfig(data)
        const userSelectedRpc = getSessionItem<Endpoint>(SESSION_STORAGE_USER_SELECTED_RPC)

        const currentEndPoint =
          useConnection.getState().currentEndPoint ??
          userSelectedRpc ??
          data.rpcs.find(({ url }) => url === selectedEndpointUrl)

        const connection = new Connection(userSelectedRpc?.url ?? selectedEndpointUrl, 'confirmed') // TEMP for DEV

        useConnection.setState((s) => ({
          availableEndPoints: unifyByKey([...(s.availableEndPoints ?? []), ...data.rpcs], (i) => i.url),
          availableDevEndPoints: data.devrpcs ? unifyByKey(data.devrpcs, (i) => i.url) : undefined,
          autoChoosedEndPoint: data.rpcs.find(({ url }) => url === selectedEndpointUrl),
          currentEndPoint,
          connection,
          isLoading: false
        }))
        // change dev mode in appSetting
        useAppSettings.setState({ inDev: currentEndPoint?.net === 'devnet' })
      })
      .catch((e) => {
        useConnection.setState({ isLoading: false })
        console.error(e)
      })
  }, [rpcsUrl])
}
