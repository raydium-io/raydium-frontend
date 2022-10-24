import { setLocalItem } from '@/functions/dom/jStorage'
import { Endpoint, UserCustomizedEndpoint } from './type'
import { LOCALSTORAGE_KEY_USER_RPC, useConnection } from './useConnection'

export async function deleteRpc(endPointUrl: Endpoint['url']) {
  setLocalItem(LOCALSTORAGE_KEY_USER_RPC, (v: UserCustomizedEndpoint[] | undefined) =>
    (v ?? []).filter((i) => i.url !== endPointUrl)
  )
  useConnection.setState({
    availableEndPoints: (useConnection.getState()?.availableEndPoints ?? []).filter((i) => i.url !== endPointUrl)
  })
  return true
}
