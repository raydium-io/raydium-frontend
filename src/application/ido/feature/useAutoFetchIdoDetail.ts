import useConnection from '@/application/connection/useConnection'
import useWallet from '@/application/wallet/useWallet'
import { useRouter } from 'next/router'
import { useEffect } from 'react'
import useIdo from '../useIdo'

export default function useAutoFetchIdoDetail() {
  const connection = useConnection((s) => s.connection)
  const walletAdapter = useWallet((s) => s.adapter)
  const { query, pathname } = useRouter()
  const fetchIdoDetail = useIdo((s) => s.fetchIdoDetail)
  useEffect(() => {
    if (!pathname.includes('acceleraytor')) return
    if (connection && walletAdapter) {
      fetchIdoDetail({ idoId: String(query.ido) })
    }
  }, [connection, walletAdapter])
}
