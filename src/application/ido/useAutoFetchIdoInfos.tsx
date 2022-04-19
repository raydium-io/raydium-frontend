import useConnection from '@/application/connection/useConnection'
import useWallet from '@/application/wallet/useWallet'
import listToMap from '@/functions/format/listToMap'
import useAsyncEffect from '@/hooks/useAsyncEffect'
import useIdo from './useIdo'
import { EffectCheckSetting, shouldEffectBeOn } from '../miscTools'
import useToken from '@/application/token/useToken'
import { fetchRawIdoListJson } from './utils/fetchRawIdoListJson'
import { hydrateIdoInfo } from './utils/hydrateIdoInfo'

export default function useAutoFetchIdoInfos(options?: { when?: EffectCheckSetting }) {
  const connection = useConnection((s) => s.connection)
  const owner = useWallet((s) => s.owner)
  const shadowKeypairs = useWallet((s) => s.shadowKeypairs)
  const tokens = useToken((s) => s.tokens)
  const getToken = useToken((s) => s.getToken)

  // raw list info
  useAsyncEffect(async () => {
    if (!shouldEffectBeOn(options?.when)) return
    const rawList = await fetchRawIdoListJson()

    const hydrated = rawList.map((raw) => {
      const base = getToken(raw.baseMint)
      const quote = getToken(raw.quoteMint)
      return hydrateIdoInfo({ ...raw, base, quote })
    })
    useIdo.setState({
      idoRawInfos: listToMap(rawList, (i) => i.id),
      idoHydratedInfos: listToMap(hydrated, (i) => i.id)
    })
  }, [tokens])

  // get SDK without state

  // hydrated
  // useAsyncEffect(async () => {
  //   if (!shouldEffectBeOn(options?.when)) return
  //   if (!Object.keys(tokens).length) return
  //   const hydratedIdoDetailInfo = (await getAllHydratedIdoInfos()) ?? []
  //   if (!hydratedIdoDetailInfo) return
  //   useIdo.setState({
  //     idoHydratedInfos: listToMap(hydratedIdoDetailInfo, (i) => i.id)
  //   })
  // }, [connection, owner, tokens, options?.when])

  // useAsyncEffect(async () => {
  //   if (!shouldEffectBeOn(options?.when)) return
  //   if (!shadowKeypairs?.length) return
  //   const hydratedIdoDetailInfo = await shadowlyGetHydratedIdoInfo()

  //   useIdo.setState({
  //     shadowIdoHydratedInfos: hydratedIdoDetailInfo
  //   })
  // }, [connection, shadowKeypairs, options?.when])
}
