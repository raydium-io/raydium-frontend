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
          availableEndPoints: unifyByKey([...data.rpcs, ...(s.availableEndPoints ?? [])], (i) => i.url),
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
