import { useRouter } from 'next/router'
import { useCallback, useEffect } from 'react'

import Link from '@/components/Link'
import jFetch from '@/functions/dom/jFetch'
import { getLocalItem } from '@/functions/dom/jStorage'
import { inClient, inServer, isInBonsaiTest, isInLocalhost } from '@/functions/judgers/isSSR'
import { eq, gt, lt } from '@/functions/numberish/compare'
import { toString } from '@/functions/numberish/toString'
import useDevice from '@/hooks/useDevice'
import { useIsomorphicLayoutEffect } from '@/hooks/useIsomorphicLayoutEffect'
import useLocalStorageItem from '@/hooks/useLocalStorage'
import { useRecordedEffect } from '@/hooks/useRecordedEffect'

import useConnection from '../connection/useConnection'
import { getSlotCountForSecond } from '../farms/useFarmInfoLoader'
import useNotification from '../notification/useNotification'
import useWallet from '../wallet/useWallet'
import { useAppVersion } from './useAppVersion'

import { useAppAdvancedSettingsSyncer } from '@/application/common/useAppAdvancedSettingsSyncer'
import useConcentrated from '../concentrated/useConcentrated'
import useFarms from '../farms/useFarms'
import useLiquidity from '../liquidity/useLiquidity'
import { usePools } from '../pools/usePools'
import useToken from '../token/useToken'
import { useApiUrlChange } from './useApiUrlChange'
import useAppSettings, { ExplorerName, ExplorerUrl } from './useAppSettings'
import { useEvent } from '@/hooks/useEvent'
import { useDocumentVisibility } from '@/hooks/useDocumentVisibility'

function useThemeModeSync() {
  const themeMode = useAppSettings((s) => s.themeMode)
  useEffect(() => {
    globalThis.document?.documentElement.classList.remove('dark', 'light')
    globalThis.document?.documentElement.classList.add(themeMode)
  }, [themeMode])
}

function useDeviceInfoSyc() {
  // device
  const { isMobile, isPc, isTablet } = useDevice()
  useIsomorphicLayoutEffect(() => {
    useAppSettings.setState({ isMobile, isTablet, isPc })
  }, [isMobile, isPc, isTablet])

  useIsomorphicLayoutEffect(() => {
    useAppSettings.setState({
      inClient: inClient,
      inServer: inServer,
      isInBonsaiTest: isInBonsaiTest,
      isInLocalhost: isInLocalhost
    })
  }, [])
}

function useDisclaimerDataSyncer() {
  useIsomorphicLayoutEffect(() => {
    useAppSettings.setState({
      needPopDisclaimer: !getLocalItem<boolean>('USER_AGREE_DISCLAIMER')
    })
  }, [])
}

function useSlippageTolerenceValidator() {
  const slippageTolerance = useAppSettings((s) => s.slippageTolerance)

  useEffect(() => {
    if (lt(slippageTolerance, 0) || gt(slippageTolerance, 1)) {
      useAppSettings.setState({ slippageToleranceState: 'invalid' })
    } else if (lt(slippageTolerance, 0.01)) {
      useAppSettings.setState({ slippageToleranceState: 'too small' })
    } else {
      useAppSettings.setState({ slippageToleranceState: 'valid' })
    }
  }, [slippageTolerance])
}

function useSlippageTolerenceSyncer() {
  const slippageTolerance = useAppSettings((s) => s.slippageTolerance)

  const [localStoredSlippage, setLocalStoredSlippage] = useLocalStorageItem<string>('SLIPPAGE', {
    validateFn: (value) => {
      if (value === undefined || !new RegExp(`^\\d*\\.?\\d*$`).test(value)) {
        return false
      }
      return true
    }
  })
  useRecordedEffect(
    ([, prevLocalStoredSlippaged]) => {
      const slippageHasLoaded = prevLocalStoredSlippaged == null && localStoredSlippage != null
      if (slippageHasLoaded && !eq(slippageTolerance, localStoredSlippage)) {
        useAppSettings.setState({
          slippageTolerance: localStoredSlippage ?? 0.01
        })
      } else if (slippageTolerance) {
        setLocalStoredSlippage(toString(slippageTolerance))
      } else {
        // cold start, set default value
        useAppSettings.setState({
          slippageTolerance: 0.01
        })
      }
    },
    [slippageTolerance, localStoredSlippage]
  )
}

function popWelcomeDialogFn(cb?: { onConfirm: () => void }) {
  useNotification.getState().popWelcomeDialog(
    <div>
      <div className="text-2xl text-white text-center m-4 mb-8">Welcome to Raydium V2</div>

      <div className="text-[#C4D6FF] mb-4 ">
        Raydium V2 is built for a faster, more streamlined experience. However, it is{' '}
        <span className="text-[#39D0D8] font-bold">still under development</span>.
      </div>
      <div className="text-[#C4D6FF] mb-4 ">
        You can still use <Link href="https://v1.raydium.io/swap">V1</Link> for Raydium's full features.
      </div>
      <div className="text-[#C4D6FF] mb-4 ">
        Help Raydium improve by reporting bugs <Link href="https://forms.gle/DvUS4YknduBgu2D7A">here</Link>, or in{' '}
        <Link href="https://discord.gg/raydium">Discord.</Link>
      </div>
    </div>,
    {
      onConfirm: () => {
        cb?.onConfirm?.()
      }
    }
  )
}

function useDefaultExplorerSyncer() {
  const explorerName = useAppSettings((s) => s.explorerName)

  const [localStoredExplorer, setLocalStoredExplorer] = useLocalStorageItem<string>('EXPLORER', {
    validateFn: (value) => {
      if (value !== ExplorerName.EXPLORER && value !== ExplorerName.SOLSCAN && value !== ExplorerName.SOLANAFM) {
        return false
      }
      return true
    }
  })
  useRecordedEffect(
    ([, prevLocalStoredExplorer]) => {
      const explorerHasLoaded = prevLocalStoredExplorer == null && localStoredExplorer != null
      if (explorerHasLoaded && explorerName !== localStoredExplorer) {
        // use local storage value
        useAppSettings.setState({
          explorerName: localStoredExplorer ?? ExplorerName.SOLSCAN,
          explorerUrl: localStoredExplorer
            ? localStoredExplorer === ExplorerName.EXPLORER
              ? ExplorerUrl.EXPLORER
              : localStoredExplorer === ExplorerName.SOLSCAN
              ? ExplorerUrl.SOLSCAN
              : ExplorerUrl.SOLANAFM
            : ExplorerUrl.SOLSCAN
        })
      } else if (explorerName) {
        // update local storage value from input
        setLocalStoredExplorer(explorerName)
      } else {
        // cold start, set default value
        useAppSettings.setState({
          explorerName: ExplorerName.SOLSCAN,
          explorerUrl: ExplorerUrl.SOLSCAN
        })
      }
    },
    [explorerName, localStoredExplorer]
  )
}

function useRpcPerformance() {
  const currentEndPoint = useConnection((s) => s.currentEndPoint)
  const { documentVisible } = useDocumentVisibility()

  const MAX_TPS = 1500 // force settings

  const getPerformance = useEvent(() => {
    const fetchUrl = useConnection.getState().currentEndPoint?.url
    if (!fetchUrl) return
    const res = jFetch<{
      result: {
        numSlots: number
        numTransactions: number
        samplePeriodSecs: number
        slot: number
      }[]
    }>(fetchUrl, {
      method: 'post',
      ignoreCache: true,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        id: 'getRecentPerformanceSamples',
        jsonrpc: '2.0',
        method: 'getRecentPerformanceSamples',
        params: [30]
      })
    }).then((result) => {
      if (fetchUrl !== useConnection.getState().currentEndPoint!.url) return
      const blocks = result?.result
      if (!blocks) return
      const perSecond = blocks.map(({ numTransactions }) => numTransactions / 60)
      const tps = perSecond.reduce((a, b) => a + b, 0) / perSecond.length
      useAppSettings.setState({ isLowRpcPerformance: tps < MAX_TPS })
    })
  })

  useEffect(() => {
    if (!documentVisible) return
    const timeoutId = setInterval(() => getPerformance(), 1000 * 60)
    return () => {
      clearTimeout(timeoutId)
    }
  }, [getPerformance, currentEndPoint?.url, documentVisible])
}

function useGetSlotCountForSecond() {
  const currentEndPoint = useConnection((s) => s.currentEndPoint)

  useEffect(() => {
    if (!currentEndPoint) return
    getSlotCountForSecond(currentEndPoint)
    const timeoutId = setInterval(() => getSlotCountForSecond(currentEndPoint), 1000 * 60)
    return () => {
      clearTimeout(timeoutId)
    }
  }, [currentEndPoint])
}

function useHandleWindowTopError() {
  const { log } = useNotification.getState()
  useEffect(() => {
    const handleError = (event: ErrorEvent): void => {
      log({ type: 'error', title: String(event.error) })
      console.error(event)
      event.preventDefault()
      event.stopPropagation()
    }
    const handleUnhandledRejection = (event: PromiseRejectionEvent): void => {
      log({ type: 'error', title: String(event.reason) })
      console.error(event)
      event.preventDefault()
      event.stopPropagation()
    }
    globalThis.addEventListener?.('error', handleError)
    globalThis.addEventListener?.('unhandledrejection', handleUnhandledRejection)
    return () => {
      globalThis.removeEventListener?.('error', handleError)
      globalThis.removeEventListener?.('unhandledrejection', handleUnhandledRejection)
    }
  }, [])
}

export function useClientInitialization() {
  useHandleWindowTopError()

  useThemeModeSync()

  useDeviceInfoSyc()

  useDisclaimerDataSyncer()

  useAppAdvancedSettingsSyncer()
}

export function useInnerAppInitialization() {
  useGetSlotCountForSecond()

  useRpcPerformance()

  useDefaultExplorerSyncer()

  useSlippageTolerenceValidator()

  useSlippageTolerenceSyncer()

  useGlobalRefresh()

  useApiUrlChange()
}

function useGlobalRefresh() {
  const { pathname } = useRouter()

  // base (tokenAccount tokenPrice balance)
  useEffect(() => {
    let timeoutId: any = 0
    setTimeout(() => {
      timeoutId = setInterval(() => {
        if (inServer) return
        if (document.visibilityState === 'hidden') return

        useWallet.getState().refreshWallet()
        useToken.getState().refreshTokenPrice()
      }, 1000 * 60)
    }, 1000 * 15) // do not refresh base and specific pages at same time
    return () => clearInterval(timeoutId)
  }, [])

  // specific pages (pool info, farm info)
  useEffect(() => {
    let intervalId: any = 0
    const timeoutId = setTimeout(() => {
      intervalId = setInterval(() => {
        if (inServer) return
        if (document.visibilityState === 'hidden') return
        if (pathname.startsWith('/farms')) useFarms.getState().refreshFarmInfos()
        if (pathname.startsWith('/pools')) usePools.getState().refreshPools()
        if (pathname.startsWith('/clmm')) useConcentrated.getState().refreshConcentrated()
        if (pathname.startsWith('/liquidity')) useLiquidity.getState().refreshLiquidity()
      }, 1000 * 60 * 2)
    }, 1000 * 25)
    return () => {
      clearTimeout(timeoutId)
      clearInterval(intervalId)
    }
  }, [pathname])
}
