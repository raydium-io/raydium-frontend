import useConnection from '@/application/connection/useConnection'
import useWallet from '@/application/wallet/useWallet'
import listToMap from '@/functions/format/listToMap'
import toPubString from '@/functions/format/toMintString'
import { objectMap, objectShakeNil } from '@/functions/objectMethods'
import useAsyncEffect from '@/hooks/useAsyncEffect'
import { useRouter } from 'next/router'
import { HydratedIdoInfo } from '../type'
import useIdo from '../useIdo'
import { fetchIdoDetail, shadowlyFetchIdoDetail } from '../utils/fetchIdoInfo'
import { EffectCheckSetting, shouldEffectBeOn } from '../../miscTools'

export default function useAutoFetchIdoDetail(options?: { when?: EffectCheckSetting }) {
  const connection = useConnection((s) => s.connection)
  const owner = useWallet((s) => s.owner)
  const shadowKeypairs = useWallet((s) => s.shadowKeypairs)
  const { query } = useRouter() // TODO: 🔥 no need

  useAsyncEffect(async () => {
    if (!shouldEffectBeOn(options?.when)) return
    const hydratedIdoDetailInfo = await fetchIdoDetail({ idoId: String(query.idoid) })
    if (!hydratedIdoDetailInfo) return

    useIdo.setState((s) => ({
      idoHydratedInfos: { ...s.idoHydratedInfos, [hydratedIdoDetailInfo.id]: hydratedIdoDetailInfo }
    }))
  }, [connection, owner, options?.when])

  useAsyncEffect(async () => {
    if (!shouldEffectBeOn(options?.when)) return
    if (!shadowKeypairs?.length) return
    const hydratedIdoDetailInfo = await shadowlyFetchIdoDetail({ idoId: String(query.idoid) })

    const shadowIdoDetailMap = objectShakeNil(
      Object.fromEntries(
        shadowKeypairs.map((keypair, idx) => [toPubString(keypair.publicKey), hydratedIdoDetailInfo[idx]])
      )
    )

    useIdo.setState((s) => {
      const mergedShadowInfos = Object.entries(shadowIdoDetailMap).reduce(
        (acc, [walletAddress, hydratedIdoDetailInfo]) => ({
          ...acc,
          [hydratedIdoDetailInfo.id]: {
            ...acc[hydratedIdoDetailInfo.id],
            [String(walletAddress)]: hydratedIdoDetailInfo
          }
        }),
        {} as { [idoid: string]: { [walletOwner: string]: HydratedIdoInfo } }
      )
      return {
        shadowIdoHydratedInfos: mergedShadowInfos
      }
    })
  }, [connection, shadowKeypairs, options?.when])
}
