import { useRouter } from 'next/router'

import useConnection from '@/application/connection/useConnection'
import useWallet from '@/application/wallet/useWallet'
import assert from '@/functions/assert'
import listToMap from '@/functions/format/listToMap'
import useAsyncEffect from '@/hooks/useAsyncEffect'

import useIdo from '../useIdo'
import { getHydratedIdoInfos } from '../utils/fetchIdoInfo'
import { EffectCheckSetting, shouldEffectBeOn } from '@/application/miscTools'

export default function useAutoFetchIdoInfo(options?: { when?: EffectCheckSetting }) {
  const connection = useConnection((s) => s.connection)
  const walletAdapter = useWallet((s) => s.adapter)

  // fetch ido json list => hydrate ido list
  useAsyncEffect(async () => {
    if (!shouldEffectBeOn(options?.when)) return
    if (!connection) return

    assert(connection, 'fetchIdoDetail: no rpc connection')

    const result = await getHydratedIdoInfos({ connection })
    if (!result) return
    const { list, bannerInfo } = result
    useIdo.setState((s) => {
      const newMap = { ...s.idoHydratedInfos, ...listToMap(list, (i) => i.id) }
      return {
        idoBannerInformations: bannerInfo,
        idoHydratedInfos: newMap
      }
    })
  }, [connection, walletAdapter, options?.when])
}
