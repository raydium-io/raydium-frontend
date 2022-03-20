import { useEffect } from 'react'
import useConnection, { LOCALSTORAGE_KEY_USER_RPC } from '../useConnection'
import { UserCustomizedEndpoint } from '../utils/fetchRPCConfig'
import useLocalStorageItem from '@/hooks/useLocalStorage'
import { unifyByKey } from '@/functions/arrayMethods'

export function useUserCustomizedEndpointInitLoad() {
  const [storagedEndpoints] = useLocalStorageItem<UserCustomizedEndpoint[]>(LOCALSTORAGE_KEY_USER_RPC)
  useEffect(() => {
    if (storagedEndpoints?.length) {
      useConnection.setState((s) => ({
        availableEndPoints: unifyByKey([...s.availableEndPoints, ...storagedEndpoints], (i) => i.url)
      }))
    }
  }, [])
}
