import BN from 'bn.js'

import useToken from '@/application/token/useToken'
import { HexAddress, MayArray, PublicKeyish } from '@/types/constants'
import { Connection, PublicKey } from '@solana/web3.js'

import { Ido } from '../sdk'
import { HydratedIdoInfo, SdkIdoInfo } from '../type'
import { hydrateIdoInfo } from './hydrateIdoInfo'
import toPubString, { toPub } from '@/functions/format/toMintString'
import useConnection from '@/application/connection/useConnection'
import useWallet from '@/application/wallet/useWallet'
import asyncMap from '@/functions/asyncMap'
import { fetchRawIdoListJson } from './fetchIdoInfo'
import { objectShakeNil } from '@/functions/objectMethods'

// function wrapJsonValueToPublicKey(value: T): PublicKey {
//   return new PublicKey(value)
// }
/**
 * rawIdoList + info from SDK
 *
 * ido base info is depends on `fetchRawIdoListJson()`
 */
// export const getAllHydratedIdoInfos = async (options?: {
//   idoId: MayArray<HexAddress>
//   owner?: PublicKeyish
// }): Promise<HydratedIdoInfo[] | undefined> => {
//   const rawList = await fetchRawIdoListJson()

//   // wrapJsonValueToPublicKey
//   const publicKeyed = rawList.map((raw) =>
//     Object.fromEntries(
//       Object.entries(raw).map(([key, value]) => {
//         if (typeof value === 'string') {
//           try {
//             const publicValue = new PublicKey(value)
//             return [key, publicValue]
//           } catch {
//             return [key, value]
//           }
//         }
//         return [key, value]
//       })
//     )
//   )

//   // eslint-disable-next-line no-console
//   console.info('idoList data start layout fetching')
//   const { owner: currentWalletOwner } = useWallet.getState()
//   const sdkIdoList = await getSdkIdoList({ publicKeyed, owner: toPub(options?.owner) ?? currentWalletOwner })
//   // eslint-disable-next-line no-console
//   console.info('idoList data end layout fetching')

//   return sdkIdoList ? asyncMap(sdkIdoList, async (sdkIdoInfo) => hydrateIdoInfo(sdkIdoInfo)) : undefined
// }

// /**
//  * just fetch an single ido
//  * @todo if {@link getAllHydratedIdoInfos} can get single ido detail, this method is actually unnecessary
//  */
// export const getSingleHydratedIdoInfo = async ({
//   idoId,
//   owner
// }: {
//   idoId: PublicKeyish
//   /** detect a special owner, default will be current connceted  */
//   owner?: PublicKeyish
// }): Promise<Required<HydratedIdoInfo> | undefined> => {
//   const result = await getAllHydratedIdoInfos({
//     owner
//   })

//   // @ts-expect-error force
//   return result?.find((idoDetail) => idoDetail.id === String(idoId))
// }

type ShowHydratedIdoInfos = {
  [idoId: string]: {
    [ownerId: string]: HydratedIdoInfo
  }
}

export async function getSdkIdoList({ publicKeyed, owner }: { publicKeyed: any[]; owner?: PublicKeyish }) {
  const { connection } = useConnection.getState()
  if (!connection) return
  return await Ido.getMultipleInfo({
    connection,
    poolsConfig: publicKeyed,
    owner: toPub(owner),
    config: { batchRequest: true }
  })
}

// /**
//  * just fetch some single ido by shadowWallets
//  */
// export async function shadowlyGetHydratedIdoInfo(): Promise<ShowHydratedIdoInfos> {
//   const { shadowKeypairs } = useWallet.getState()
//   if (!shadowKeypairs) return {}
//   const allResult = await asyncMap(shadowKeypairs ?? [], (keypairs) =>
//     getAllHydratedIdoInfos({ owner: keypairs.publicKey })
//   )
//   const tempResultArray: { owner: HexAddress; idoId: HexAddress; idoInfo: HydratedIdoInfo }[] = allResult.flatMap(
//     (oneOwnerIdoInfo, idx) => {
//       if (!oneOwnerIdoInfo) return []
//       const owner = toPubString(shadowKeypairs[idx].publicKey)
//       return oneOwnerIdoInfo.map((info) => ({ owner, idoId: info.id, idoInfo: info }))
//     }
//   )
//   const structured = tempResultArray.reduce(
//     (acc, { owner, idoId, idoInfo }) => ({ ...acc, [idoId]: { ...acc[idoId], [owner]: idoInfo } }),
//     {} as ShowHydratedIdoInfos
//   )
//   return structured
// }

export async function refreshIdoInfo(idoid: string) {
  /** TODO */
}
