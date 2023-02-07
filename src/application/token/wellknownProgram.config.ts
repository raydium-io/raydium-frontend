import { DEVNET_PROGRAM_ID, MAINNET_PROGRAM_ID } from '@raydium-io/raydium-sdk'

import useAppSettings from '../common/useAppSettings'

export const SDK_PROGRAM_IDS = useAppSettings.getState().inDev ? DEVNET_PROGRAM_ID : MAINNET_PROGRAM_ID
