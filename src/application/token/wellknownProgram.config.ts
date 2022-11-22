import { toPub } from '@/functions/format/toMintString'
import useAppSettings from '../common/useAppSettings'

/** just use {@link getAmmV3ProgramId} for auto detect dev mode */
export const ammV3ProgramId = toPub('CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK')

/** just use {@link getAmmV3ProgramId} for auto detect dev mode */
export const ammV3DevProgramId = toPub('DEVeYuwvQnhz1roDpSwqmnWtoKTeYftM7Qt7gFPMF3tj')

export const createNewMarketPargramId = toPub('EoTcMgcDRTJVZDMZWBoU6rhYHZfkNTVEAfz3uUJRcYGj')

export const getAmmV3ProgramId = () => (useAppSettings.getState().inDev ? ammV3DevProgramId : ammV3ProgramId)

/** not only swap, it's just a temporary hack */
export const dangerousTempProgramIds = [
  'routeUGWgWzqBWFcrCfv8tritsqukccJPu3q5GPP3xS',
  'RVKd61ztZW9GUwhRbbLoYVRE5Xf1B2tVscKqwZqXgEr',
  '27haf8L6oxUeXrHrgEgsexjSY5hbVUWEmvv9Nyxg8vQv',
  '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8',
  '5quBtoiQqxF9Jv6KYKctB59NT3gtJD2Y65kdnB1Uev3h',
  'CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK'
]
