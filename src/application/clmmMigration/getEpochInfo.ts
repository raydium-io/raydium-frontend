import { EpochInfo } from '@solana/web3.js'
import { createTimeoutMap } from '../../functions/createTimeoutMap'
import useConnection from '../connection/useConnection'

const epochInfoCache = createTimeoutMap<'epochInfo', Promise<EpochInfo>>({ maxAgeMs: 30 * 1000 })

/**
 *
 * @todo cache for 30s
 */
export async function getEpochInfo() {
  const { connection } = useConnection.getState()
  if (!connection) return Promise.reject('connection is not ready')
  const v = epochInfoCache.get('epochInfo')
  if (!v) {
    const i = connection.getEpochInfo()
    epochInfoCache.set('epochInfo', i)
    return i
  } else {
    return v
  }
}
