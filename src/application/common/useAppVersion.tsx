import { useEffect } from 'react'

import { create } from 'zustand'

import jFetch from '@/functions/dom/jFetch'
import { inClient } from '@/functions/judgers/isSSR'

import useAppAdvancedSettings from './useAppAdvancedSettings'

// frontend (client)
const APP_VERSION = 'V2.11.24'

const APP_VERSION_CHECKING_DELAY_TIME = 1000 * 60 * 1

interface BackEndVersion {
  latest: string
  least: string
}

//#region ------------------- store -------------------
export type AppVersionStore = {
  // backend (client)
  latest?: string // example: 'V2.1.0'
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
  const appVersionUrl = useAppAdvancedSettings((s) => s.apiUrls.version)
  const getVersion = async () => {
    if (inClient && document.visibilityState === 'hidden') return
    const config = await getBackendVersion()
    if (!config) return
    useAppVersion.setState({ latest: config.latest, least: config.least })
  }
  useEffect(() => {
    getVersion()
    setInterval(() => {
      getVersion()
    }, APP_VERSION_CHECKING_DELAY_TIME)
  }, [appVersionUrl])
}

export function useJudgeAppVersion() {
  const latest = useAppVersion((s) => s.latest)
  const least = useAppVersion((s) => s.least)
  const currentVersion = useAppVersion((s) => s.currentVersion)
  useEffect(() => {
    if (!latest || !least) return
    if (isVersionOlder(currentVersion, least)) {
      useAppVersion.setState({
        versionFresh: 'too-old'
      })
    } else if (isVersionEqual(currentVersion, latest) || isVersionNewer(currentVersion, latest)) {
      useAppVersion.setState({
        versionFresh: 'newest-version'
      })
    } else {
      useAppVersion.setState({
        versionFresh: 'it-works'
      })
    }
  }, [latest, least, currentVersion])
}
//#endregion

//#region ------------------- util function -------------------
async function getBackendVersion() {
  const appVersionUrl = useAppAdvancedSettings.getState().apiUrls.version
  return jFetch<BackEndVersion>(appVersionUrl, { ignoreCache: true })
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
  if (versionConfig1.main != null && versionConfig2.main != null && versionConfig1.main !== versionConfig2.main)
    return versionConfig1.main < versionConfig2.main
  if (
    versionConfig1.feature != null &&
    versionConfig2.feature != null &&
    versionConfig1.feature !== versionConfig2.feature
  )
    return versionConfig1.feature < versionConfig2.feature
  if (versionConfig1.fix != null && versionConfig2.fix != null && versionConfig1.fix !== versionConfig2.fix)
    return versionConfig1.fix < versionConfig2.fix

  return false
}
function isVersionNewer(version1: string, version2: string): boolean {
  return !isVersionOlder(version1, version2) && !isVersionEqual(version1, version2)
}
//#endregion
