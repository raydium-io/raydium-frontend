export interface UserCustomizedEndpoint {
  name: string
  url: string
  isUserCustomized: true
}
export interface Endpoint {
  name?: string
  url: string
  weight?: number
  isUserCustomized?: true
  net?: 'mainnet' | 'devnet'
}

export interface Config {
  strategy: 'speed' | 'weight' | 'sequence'
  success: boolean
  rpcs: Endpoint[]
  devrpcs: Endpoint[]
}
