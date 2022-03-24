import useConnection from '@/application/connection/useConnection'
import useWallet from '@/application/wallet/useWallet'
import listToMap from '@/functions/format/listToMap'
import useAsyncEffect from '@/hooks/useAsyncEffect'
import useIdo from '../useIdo'
import { getAllHydratedIdoInfos, shadowlyGetHydratedIdoInfo } from '../utils/getHydratedInfo'
import { EffectCheckSetting, shouldEffectBeOn } from '../../miscTools'

export default function useAutoFetchIdoDetail(options?: { when?: EffectCheckSetting }) {
  const connection = useConnection((s) => s.connection)
  const owner = useWallet((s) => s.owner)
  const shadowKeypairs = useWallet((s) => s.shadowKeypairs)

  useAsyncEffect(async () => {
    if (!shouldEffectBeOn(options?.when)) return
    const hydratedIdoDetailInfo = (await getAllHydratedIdoInfos()) ?? []
    if (!hydratedIdoDetailInfo) return
    useIdo.setState({
      idoHydratedInfos: listToMap(hydratedIdoDetailInfo, (i) => i.id)
    })
  }, [connection, owner, options?.when])

  useAsyncEffect(async () => {
    if (!shouldEffectBeOn(options?.when)) return
    if (!shadowKeypairs?.length) return
    const hydratedIdoDetailInfo = await shadowlyGetHydratedIdoInfo()

    useIdo.setState({
      shadowIdoHydratedInfos: hydratedIdoDetailInfo
    })
  }, [connection, shadowKeypairs, options?.when])
}
