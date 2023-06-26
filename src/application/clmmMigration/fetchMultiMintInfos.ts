import { toPub } from '@/functions/format/toMintString'
import { PublicKeyish } from '@/types/constants'
import { fetchMultipleMintInfos } from '@raydium-io/raydium-sdk'
import useConnection from '../connection/useConnection'

/**
 *
 * @todo cache for 10min
 */
export async function fetchMultiMintInfos({ mints }: { mints: PublicKeyish[] }) {
  const { connection } = useConnection.getState()
  if (!connection) return Promise.reject('connection is not ready')
  return fetchMultipleMintInfos({ connection, mints: mints.map((i) => toPub(i)) })
}

/**
 *
 * @todo cache for 30s
 */
export async function getEpochInfo() {
  const { connection } = useConnection.getState()
  if (!connection) return Promise.reject('connection is not ready')
  return connection.getEpochInfo()
}
