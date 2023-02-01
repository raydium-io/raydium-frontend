import { toPub } from '@/functions/format/toMintString'
import { DEVNET_PROGRAM_ID, MAINNET_PROGRAM_ID } from '@raydium-io/raydium-sdk'

import useAppSettings from '../common/useAppSettings'

/**
 * @deprecated
 */
const ammV3ProgramId = toPub('CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK')
/**
 * @deprecated
 */
const ammV3DevProgramId = toPub('DEVeYuwvQnhz1roDpSwqmnWtoKTeYftM7Qt7gFPMF3tj')
/**
 * @deprecated
 */
export const getAmmV3ProgramId = () => (useAppSettings.getState().inDev ? ammV3DevProgramId : ammV3ProgramId)

/**
 * @deprecated
 */
const createNewMarketDevPargramId = toPub('EoTcMgcDRTJVZDMZWBoU6rhYHZfkNTVEAfz3uUJRcYGj')
/**
 * @deprecated
 */
const createNewMarketPargramId = MAINNET_PROGRAM_ID.OPENBOOK_MARKET
/**
 * @deprecated
 */
export const getCreateNewMarketProgramId = () =>
  useAppSettings.getState().inDev ? createNewMarketDevPargramId : createNewMarketPargramId

export const sdkDefaultProgramId = useAppSettings.getState().inDev ? DEVNET_PROGRAM_ID : MAINNET_PROGRAM_ID
