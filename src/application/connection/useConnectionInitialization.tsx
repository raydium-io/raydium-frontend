import { useEffect } from 'react'

import { Connection } from '@solana/web3.js'

import useConnection, { SESSION_STORAGE_USER_SELECTED_RPC } from './useConnection'
import caculateEndpointUrlByRpcConfig from './caculateEndpointUrlByRpcConfig'
import { unifyByKey } from '@/functions/arrayMethods'
import jFetch from '@/functions/dom/jFetch'
import { getSessionItem } from '@/functions/dom/jStorage'

export interface Endpoint {
  name?: string
  url: string
  weight?: number
  isUserCustomized?: true
}

export interface Config {
  strategy: 'speed' | 'weight'
  success: boolean
  rpcs: Endpoint[]
}

const devRpcConfig: Omit<Config, 'success'> = {
  rpcs: [
    // { name: 'genesysgo', url: 'https://raydium.genesysgo.net', weight: 0 }
    // { name: 'rpcpool', url: 'https://raydium.rpcpool.com', weight: 100 }
    // { url: 'https://arbirgis.rpcpool.com/', weight: 100 },
    // { url: 'https://solana-api.projectserum.com', weight: 100 }
    { name: 'beta-mainnet', url: 'https://api.mainnet-beta.solana.com/' },
    // { name: 'api.mainnet', url: 'https://api.mainnet.rpcpool.com/' }, // not support ws
    { name: 'genesysgo-dao', url: 'https://ssc-dao.genesysgo.net/' }, // only for bonsai, local may be crashed
    { name: 'tt', url: 'https://solana-api.tt-prod.net' }
  ],
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
          Reflect.set(data, 'rpcs', devRpcConfig.rpcs)
          Reflect.set(data, 'strategy', devRpcConfig.strategy)
        }

        const selectedEndpointUrl = await caculateEndpointUrlByRpcConfig(data)
        const userSelectedRpc = getSessionItem<Endpoint>(SESSION_STORAGE_USER_SELECTED_RPC)

        const connection = new Connection(userSelectedRpc?.url ?? selectedEndpointUrl, 'confirmed')

        useConnection.setState((s) => ({
          availableEndPoints: unifyByKey([...data.rpcs, ...(s.availableEndPoints ?? [])], (i) => i.url),
          autoChoosedEndPoint: data.rpcs.find(({ url }) => url === selectedEndpointUrl),
          currentEndPoint:
            s.currentEndPoint ?? userSelectedRpc ?? data.rpcs.find(({ url }) => url === selectedEndpointUrl),
          connection,
          isLoading: false
        }))
      })
      .catch(console.error)
  }, [])
}
