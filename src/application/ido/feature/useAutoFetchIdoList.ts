import { useRouter } from 'next/router'

import useConnection from '@/application/connection/useConnection'
import useWallet from '@/application/wallet/useWallet'
import assert from '@/functions/assert'
import listToMap from '@/functions/format/listToMap'
import useAsyncEffect from '@/hooks/useAsyncEffect'

import useIdo from '../useIdo'
import { fetchIdoList } from '../utils/fetchIdoInfo'

export default function useAutoFetchIdoInfo() {
  const connection = useConnection((s) => s.connection)
  const walletAdapter = useWallet((s) => s.adapter)
  const { pathname } = useRouter()

  // fetch ido json list => hydrate ido list
  useAsyncEffect(async () => {
    if (!pathname.includes('acceleraytor')) return
    if (!connection) return

    assert(connection, 'fetchIdoDetail: no rpc connection')

    const result = await fetchIdoList({ connection })
    if (!result) return
    const { list, bannerInfo } = result
    useIdo.setState((s) => {
      const newMap = { ...s.idoHydratedInfos, ...listToMap(list, (i) => i.id) }
      return {
        idoBannerInformations: bannerInfo,
        idoHydratedInfos: newMap
      }
    })
  }, [connection, walletAdapter])
}
