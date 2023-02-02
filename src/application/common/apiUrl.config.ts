import { objectMap } from '@/functions/objectMethods'
import { RAYDIUM_MAINNET, RAYDIUM_DEVNET, ENDPOINT } from '@raydium-io/raydium-sdk'

export type ApiConfig = typeof RAYDIUM_MAINNET

export const mainnetApiConfig = objectMap(RAYDIUM_MAINNET, (v) => `${ENDPOINT}${v}`) as ApiConfig
export const devnetApiConfig = objectMap(RAYDIUM_DEVNET, (v) => `${ENDPOINT}${v}`) as ApiConfig
