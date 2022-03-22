import jFetch from '@/functions/dom/jFetch'
import { inClient } from '@/functions/judgers/isSSR'
import { useEffect } from 'react'
import create from 'zustand'

// frontend (client)
const APP_VERSION = 'V2.1.4'

const APP_VERSION_CHECKING_DELAY_TIME = 1000 * 60 * 1

interface BackEndVersion {
  latest: string
  least: string
}

//#region ------------------- store -------------------

export type AppVersionStore = {
  // backend (client)
  lastest?: string // example: 'V2.1.0'
  least?: string // example: 'V2.1.0'

  // frontend (client)
  currentVersion: string // example: 'V2.1.0'

  versionFresh?: 'newest-version' | 'it-works' | 'too-old'
}

export const useAppVersion = create<AppVersionStore>(() => ({
  currentVersion: APP_VERSION
}))

//#endregion

//#region ------------------- hooks -------------------
export function useAppInitVersionPostHeartBeat() {
  const getVersion = async () => {
    if (inClient && document.visibilityState === 'hidden') return
    const config = await getBackendVersion()
    if (!config) return
    useAppVersion.setState({ lastest: config.latest, least: config.least })
  }
  useEffect(() => {
    getVersion()
    setInterval(() => {
      getVersion()
    }, APP_VERSION_CHECKING_DELAY_TIME)
  }, [])
}

export function useJudgeAppVersion() {
  const { lastest, least, currentVersion } = useAppVersion()
  useEffect(() => {
    if (!lastest || !least) return
    if (isVersionOlder(currentVersion, least)) {
      useAppVersion.setState({
        versionFresh: 'too-old'
      })
    } else if (isVersionEqual(currentVersion, lastest) || isVersionNewer(currentVersion, lastest)) {
      useAppVersion.setState({
        versionFresh: 'newest-version'
      })
    } else {
      useAppVersion.setState({
        versionFresh: 'it-works'
      })
    }
  }, [lastest, least])
}
//#endregion

//#region ------------------- util function -------------------
async function getBackendVersion() {
  return jFetch<BackEndVersion>('https://api.raydium.io/v2/main/version', { ignoreCache: true })
}

function parseVersionString(versionString: string) {
  const [, main, feature, fix] = versionString.match(/^V(\d+)\.(\d+)\.(\d+)/) ?? []
  const toNumber = (v: string) => (v != null ? Number(v) : undefined)
  return {
    main: toNumber(main),
    feature: toNumber(feature),
    fix: toNumber(fix)
  }
}
function isVersionEqual(version1: string, version2: string): boolean {
  return version1 === version2
}
function isVersionOlder(version1: string, version2: string): boolean {
  const versionConfig1 = parseVersionString(version1)
  const versionConfig2 = parseVersionString(version2)
  if (versionConfig1.main && versionConfig2.main && versionConfig1.main < versionConfig2.main) return true
  if (versionConfig1.feature && versionConfig2.feature && versionConfig1.feature < versionConfig2.feature) return true
  if (versionConfig1.fix && versionConfig2.fix && versionConfig1.fix < versionConfig2.fix) return true
  return false
}
function isVersionNewer(version1: string, version2: string): boolean {
  return !isVersionOlder(version1, version2) && !isVersionEqual(version1, version2)
}
//#endregion
