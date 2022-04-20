import { useEffect } from 'react'

import { Connection } from '@solana/web3.js'

import useConnection from './useConnection'
import caculateEndpointUrlByRpcConfig from './caculateEndpointUrlByRpcConfig'
import { unifyByKey } from '@/functions/arrayMethods'
import jFetch from '@/functions/dom/jFetch'

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
    { name: 'ankr', url: 'https://rpc.ankr.com/solana', weight: 100 }
    // { name: 'api.mainnet', url: 'https://api.mainnet.rpcpool.com/', weight: 100 }
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
        const connection = new Connection(selectedEndpointUrl, 'confirmed')

        useConnection.setState((s) => ({
          availableEndPoints: unifyByKey([...data.rpcs, ...(s.availableEndPoints ?? [])], (i) => i.url),
          autoChoosedEndPoint: data.rpcs.find(({ url }) => url === selectedEndpointUrl),
          currentEndPoint: s.currentEndPoint ?? data.rpcs.find(({ url }) => url === selectedEndpointUrl),
          connection,
          isLoading: false
        }))
      })
      .catch(console.error)
  }, [])
}
