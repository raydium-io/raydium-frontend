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
    const { adapter: walletAdapter } = useWallet.getState()

    assert(connection, 'fetchIdoDetail: no rpc connection')

    const result = await fetchIdoList({ connection, walletAdapter })
    if (!result) return
    const { list, bannerInfo } = result
    useIdo.setState((s) => {
      const oldList = s.idoHydratedInfos
      const newMap = { ...listToMap(oldList, (i) => i.id), ...listToMap(list, (i) => i.id) }
      return {
        idoBannerInformations: bannerInfo,
        idoHydratedInfos: Object.values(newMap)
      }
    })
  }, [connection, walletAdapter])
}
