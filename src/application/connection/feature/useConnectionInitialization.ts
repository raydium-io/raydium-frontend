import { useEffect } from 'react'

import { Connection } from '@solana/web3.js'

import useConnection from '../useConnection'
import assertAppVersion from '../utils/assertAppVersion'
import caculateEndpointUrlByRpcConfig from '../utils/caculateEndpointUrlByRpcConfig'
import fetchRpcConfigs, { Config } from '../utils/fetchRPCConfig'
import postHeartBeat from '../utils/postHeartBeat'
import { unifyByKey } from '@/functions/arrayMethods'
import { APP_VERSION } from '@/application/appSettings/useAppSettings'

const devRpcConfig: Omit<Config, 'success'> = {
  rpcs: [
    { name: 'genesysgo', url: 'https://raydium.genesysgo.net', weight: 0 }
    // { name: 'rpcpool', url: 'https://raydium.rpcpool.com', weight: 100 }
    // { url: 'https://arbirgis.rpcpool.com/', weight: 100 },
    // { url: 'https://solana-api.projectserum.com', weight: 100 }
    // { url: 'https://mainnet.rpcpool.com/', weight: 100 },
    // { url: 'https://api.mainnet.rpcpool.com/', weight: 100 }
  ],
  strategy: 'speed'
}

/**
 * **only in `_app.tsx`**
 *
 * will base on rpcpools(in dev mode) to establish connection
 */
export default function useConnectionInitialization({
  callbacks
}: {
  callbacks?: { onVersionTooOld?(info: { localVersion: string; timestamp: number }): void }
} = {}) {
  useEffect(() => {
    useConnection.setState({ isLoading: true })
    fetchRpcConfigs(APP_VERSION)
      .then(async (data) => {
        // dev test
        if (!globalThis.location.host.includes('raydium.io')) {
          data.rpcs = devRpcConfig.rpcs
          data.strategy = devRpcConfig.strategy
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
        assertAppVersion(data, () => {
          callbacks?.onVersionTooOld?.({ localVersion: APP_VERSION, timestamp: Date.now() })
        })
        useConnection.setState({ isInHeartbeat: true })
        postHeartBeat(APP_VERSION, () => {
          callbacks?.onVersionTooOld?.({ localVersion: APP_VERSION, timestamp: Date.now() })
        })
      })
      .catch(console.error)
  }, [])
}
