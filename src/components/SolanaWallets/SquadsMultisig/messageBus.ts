export interface WalletMessage {
  id: string
  method: string
  payload: Record<string, unknown>
}

export interface EmbeddedWalletProvider {
  postMessage: (message: WalletMessage, targetOrigin: string) => void
}

/*
 * Allows using 'sendRequest' and awaiting a response via the Window.postMessage API.
 * Must call 'connect' before use, and 'disconnect' afterward to remove listeners.
 */

export class MessageBus {
  readonly provider: EmbeddedWalletProvider
  private connected: boolean
  private requestHandlers: Map<string, [(value: string) => void, (reason: Error) => void]> = new Map()
  private readonly targetOrigin: string

  constructor(provider: EmbeddedWalletProvider, targetOrigin: string) {
    this.provider = provider
    this.connected = false
    this.targetOrigin = targetOrigin
  }

  private handleIncomingMessage = (event: MessageEvent) => {
    if (event.source === top) {
      // event.data is the entire payload of the event
      const payload = event.data
      // the 'data' key within the payload indicates success
      // while the 'error' key within the payload indicates an error
      if (payload.data && payload.id) {
        this.resolveRequest(payload.id, payload.data)
      } else if (payload.error) {
        this.rejectRequest(payload.id, new Error(payload.error))
      }
    }
  }

  connect = () => {
    if (!window) throw new Error('MessageBus runs client-side only')
    if (this.connected) return
    window.addEventListener('message', this.handleIncomingMessage)
    this.connected = true
  }

  sendRequest = async (id: string, method: string, params: Record<string, unknown> = {}): Promise<any> => {
    if (!this.connected) throw new Error('MessageBus is not connected')
    return await new Promise((resolve, reject) => {
      this.requestHandlers.set(id, [resolve, reject])
      this.provider.postMessage(
        {
          id,
          method,
          payload: {
            ...params
          }
        },
        this.targetOrigin
      )
    })
  }

  private resolveRequest = (requestID: string, value: any) => {
    const handlers = this.requestHandlers.get(requestID)
    if (!handlers) return
    const [resolve] = handlers
    resolve(value?.txSignature ? value.txSignature : value)
  }

  private rejectRequest = (requestID: string, reason: Error) => {
    const handlers = this.requestHandlers.get(requestID)
    if (!handlers) return
    const [, reject] = handlers
    reject(reason)
  }

  disconnect = () => {
    if (!this.connected) return
    this.requestHandlers.forEach(([, reject], id) => {
      this.requestHandlers.delete(id)
      reject(new Error('Wallet disconnected'))
    })
    window.removeEventListener('message', this.handleIncomingMessage)
    this.connected = false
  }
}
