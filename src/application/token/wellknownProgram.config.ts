import { toPub } from '@/functions/format/toMintString'
import useAppSettings from '../common/useAppSettings'

/** just use {@link getAmmV3ProgramId} for auto detect dev mode */
export const ammV3ProgramId = toPub('CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK')

/** just use {@link getAmmV3ProgramId} for auto detect dev mode */
export const ammV3DevProgramId = toPub('DEVeYuwvQnhz1roDpSwqmnWtoKTeYftM7Qt7gFPMF3tj')

export const getAmmV3ProgramId = () => (useAppSettings.getState().inDev ? ammV3DevProgramId : ammV3ProgramId)
