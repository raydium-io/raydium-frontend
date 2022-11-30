import { Connection } from '@solana/web3.js'
import { unifyByKey } from '@/functions/arrayMethods'
import assert from '@/functions/assert'
import { setLocalItem, setSessionItem } from '@/functions/dom/jStorage'
import useNotification from '../notification/useNotification'
import { Endpoint, UserCustomizedEndpoint } from './type'
import { useConnection, SESSION_STORAGE_USER_SELECTED_RPC, LOCALSTORAGE_KEY_USER_RPC } from './useConnection'
import { extractRPCName } from './extractRPCName'
import useAppSettings from '../common/useAppSettings'
import useWallet from '@/application/wallet/useWallet'

export async function switchRpc(customizedEndPoint: Endpoint) {
  try {
    if (!customizedEndPoint.url.replace(/.*:\/\//, '')) return
    // set loading
    useConnection.setState({ isLoading: true, loadingCustomizedEndPoint: customizedEndPoint })
    const response = await fetch(customizedEndPoint.url, {
      headers: {
        'content-type': 'application/json'
      },
      method: 'POST',
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getEpochInfo' })
    })
    assert(response.ok)
    const { connected, adapter, select } = useWallet.getState()
    if (connected && adapter) {
      adapter.off('disconnect')
      const fn = () => {
        window.setTimeout(() => {
          select(adapter.name)
        }, 0)

        adapter.off('disconnect', fn)
      }
      adapter.once('disconnect', fn)
    }
    const newConnection = new Connection(customizedEndPoint.url, 'confirmed')
    useConnection.setState({
      connection: newConnection,
      currentEndPoint: customizedEndPoint,
      switchConnectionFailed: false
    })

    // change dev mode in appSetting
    useAppSettings.setState({ inDev: customizedEndPoint.net === 'devnet' })

    const { currentEndPoint } = useConnection.getState()
    if (currentEndPoint === customizedEndPoint) {
      const rpcName = customizedEndPoint.name ?? extractRPCName(customizedEndPoint.url)
      const newEndPoint = { ...customizedEndPoint, name: rpcName }
      // cancel loading status
      useConnection.setState({ isLoading: false, switchConnectionFailed: false })

      const { logSuccess } = useNotification.getState()
      logSuccess('RPC Switch Success ', `new rpc: ${newEndPoint.name}`)

      // record selection to senssionStorage
      setSessionItem(SESSION_STORAGE_USER_SELECTED_RPC, newEndPoint)

      const isUserAdded = !useConnection
        .getState()
        .availableEndPoints.map((i) => i.url)
        .includes(newEndPoint.url)

      if (isUserAdded) {
        // record userAdded to localStorage
        setLocalItem(LOCALSTORAGE_KEY_USER_RPC, (v) =>
          unifyByKey([{ ...newEndPoint, isUserCustomized: true } as UserCustomizedEndpoint, ...(v ?? [])], (i) => i.url)
        )
      }

      useConnection.setState((s) => {
        const unified = unifyByKey(
          [...(s.availableEndPoints ?? []), { ...newEndPoint, isUserCustomized: true } as UserCustomizedEndpoint],
          (i) => i.url
        )
        return {
          currentEndPoint: newEndPoint,
          availableEndPoints: unified
        }
      })

      return true
    }
    return undefined
  } catch {
    const { currentEndPoint } = useConnection.getState()
    // cancel loading status
    useConnection.setState({ isLoading: false, loadingCustomizedEndPoint: undefined, switchConnectionFailed: true })
    const { logError } = useNotification.getState()
    logError('RPC Switch Failed')
    return false
  }
}
