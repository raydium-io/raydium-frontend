import { useEffect } from 'react'

import { Connection } from '@solana/web3.js'

import useConnection, { SESSION_STORAGE_USER_SELECTED_RPC } from './useConnection'
import { Config, Endpoint } from './type'
import caculateEndpointUrlByRpcConfig from './caculateEndpointUrlByRpcConfig'
import { unifyByKey } from '@/functions/arrayMethods'
import jFetch from '@/functions/dom/jFetch'
import { getSessionItem } from '@/functions/dom/jStorage'
import useAppSettings from '../common/useAppSettings'

const mockRPCConfig: Omit<Config, 'success'> = {
  rpcs: [
    // { name: 'genesysgo', url: 'https://raydium.genesysgo.net', weight: 0 }
    // { name: 'rpcpool', url: 'https://raydium.rpcpool.com', weight: 100 }
    // { url: 'https://arbirgis.rpcpool.com/', weight: 100 },
    // { url: 'https://solana-api.projectserum.com', weight: 100 }
    { name: 'beta-mainnet', url: 'https://api.mainnet-beta.solana.com/' },
    // { name: 'api.mainnet', url: 'https://api.mainnet.rpcpool.com/' }, // not support ws
    { name: 'genesysgo-dao', url: 'https://ssc-dao.genesysgo.net/' }, // only for bonsai, local may be crashed
    { name: 'tt', url: 'https://solana-api.tt-prod.net' }
    // { name: 'free-rpc', url: 'https://solana-api.tt-prod.net' },
  ],
  devrpcs: [{ name: 'devnet', url: 'https://api.devnet.solana.com/', net: 'devnet' }],

  strategy: 'speed'
}

/**
 * **only in `_app.tsx`**
 *
 * will base on rpcpools(in dev mode) to establish connection
 */
export default function useConnectionInitialization() {
  useEffect(() => {
    useConnection.setState({ isLoading: true })

    jFetch<Config>('https://api.raydium.io/v2/main/rpcs')
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
      .catch(console.error)
  }, [])
}
