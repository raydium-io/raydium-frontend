import { PublicKey } from '@solana/web3.js'
import { AppProps } from 'next/app'
import { useRouter } from 'next/router'
import NextNProgress from 'nextjs-progressbar'

import {
  useDeviceInfoSyc,
  useDisclaimerDataSyncer,
  useSentryConfigurator,
  useSlippageTolerenceSyncer,
  useSlippageTolerenceValidator,
  useThemeModeSync
} from '@/application/appSettings/initializationHooks'
import { useAppInitVersionPostHeartBeat, useJudgeAppVersion } from '@/application/appVersion/useAppVersion'
import useConnectionInitialization from '@/application/connection/useConnectionInitialization'
import useFreshChainTimeOffset from '@/application/connection/useFreshChainTimeOffset'
import { useUserCustomizedEndpointInitLoad } from '@/application/connection/useUserCustomizedEndpointInitLoad'
import useFarmInfoLoader from '@/application/farms/useFarmInfoLoader'
import useLiquidityInfoLoader from '@/application/liquidity/useLiquidityInfoLoader'
import useMessageBoardFileLoader from '@/application/messageBoard/useMessageBoardFileLoader'
import useMessageBoardReadedIdRecorder from '@/application/messageBoard/useMessageBoardReadedIdRecorder'
import usePoolsInfoLoader from '@/application/pools/usePoolsInfoLoader'
import useStealDataFromFarm from '@/application/staking/useStealDataFromFarm'
import useAutoUpdateSelectableTokens from '@/application/token/useAutoUpdateSelectableTokens'
import { useLpTokenMethodsLoad } from '@/application/token/useLpTokenMethodsLoad'
import useLpTokensLoader from '@/application/token/useLpTokensLoader'
import useTokenMintAutoRecord from '@/application/token/useTokenFlaggedMintAutoRecorder'
import { useTokenGetterFnLoader } from '@/application/token/useTokenGetterFnLoader'
import useTokenListSettingsLocalStorage from '@/application/token/useTokenListSettingsLocalStorage'
import useTokenListsLoader from '@/application/token/useTokenListsLoader'
import useTokenPriceRefresher from '@/application/token/useTokenPriceRefresher'
import useInitRefreshTransactionStatus from '@/application/txHistory/useInitRefreshTransactionStatus'
import useSyncTxHistoryWithLocalStorage from '@/application/txHistory/useSyncTxHistoryWithLocalStorage'
import useInitBalanceRefresher from '@/application/wallet/useBalanceRefresher'
import { useInitShadowKeypairs } from '@/application/wallet/useInitShadowKeypairs'
import { useSyncWithSolanaWallet } from '@/application/wallet/useSyncWithSolanaWallet'
import useTokenAccountsRefresher from '@/application/wallet/useTokenAccountsRefresher'
import { useWalletAccountChangeListeners } from '@/application/wallet/useWalletAccountChangeListeners'
import { useWalletConnectNotifaction } from '@/application/wallet/useWalletConnectNotifaction'
import { DRAWER_STACK_ID } from '@/components/Drawer'
import NotificationSystemStack from '@/components/NotificationSystemStack'
import { POPOVER_STACK_ID } from '@/components/Popover'
import { SolanaWalletProviders } from '@/components/SolanaWallets/SolanaWallets'
import { createDOMElement } from '@/functions/dom/createDOMElement'
import toPubString from '@/functions/format/toMintString'
import { inClient } from '@/functions/judgers/isSSR'
import useHandleWindowTopError from '@/hooks/useHandleWindowTopError'
import { useIsomorphicLayoutEffect } from '@/hooks/useIsomorphicLayoutEffect '
import RecentTransactionDialog from '@/pageComponents/dialogs/RecentTransactionDialog'
import WalletSelectorDialog from '@/pageComponents/dialogs/WalletSelectorDialog'

import '../styles/index.css'

export default function MyApp({ Component, pageProps }: AppProps) {
  const { pathname } = useRouter()

  /* add popup stack */
  useIsomorphicLayoutEffect(() => {
    if (inClient) {
      const hasPopoverStack = Boolean(document.getElementById(POPOVER_STACK_ID))
      if (hasPopoverStack) return
      const popoverStackElement = createDOMElement({
        classNames: ['fixed', 'z-popover', 'inset-0', 'self-pointer-events-none'],
        id: POPOVER_STACK_ID
      })
      document.body.append(popoverStackElement)
    }

    if (inClient) {
      const hasDrawerStack = Boolean(document.getElementById(DRAWER_STACK_ID))
      if (hasDrawerStack) return
      const drawerStackElement = createDOMElement({
        classNames: ['fixed', 'z-drawer', 'inset-0', 'self-pointer-events-none'],
        id: DRAWER_STACK_ID
      })
      document.body.append(drawerStackElement)
    }
  }, [])

  return (
    <SolanaWalletProviders>
      {/* initializations hooks */}
      <ClientInitialization />
      {pathname !== '/' && <ApplicationsInitializations />}

      <div className="app">
        <NextNProgress color="#34ade5" showOnShallow={false} />

        {/* Page Components */}
        <Component {...pageProps} />

        {/* Global Components */}
        <RecentTransactionDialog />
        <WalletSelectorDialog />
        <NotificationSystemStack />
      </div>
    </SolanaWalletProviders>
  )
}

// accelerayte
PublicKey.prototype.toString = function () {
  return toPubString(this)
}
PublicKey.prototype.toJSON = function () {
  return toPubString(this)
}

function ClientInitialization() {
  useHandleWindowTopError()

  // sentry settings
  useSentryConfigurator()

  useThemeModeSync()

  useDeviceInfoSyc()

  useDisclaimerDataSyncer()

  return null
}

function ApplicationsInitializations() {
  useSlippageTolerenceValidator()
  useSlippageTolerenceSyncer()

  /********************** appVersion **********************/
  useAppInitVersionPostHeartBeat()
  useJudgeAppVersion()

  /********************** connection **********************/
  useUserCustomizedEndpointInitLoad()
  useConnectionInitialization()
  useFreshChainTimeOffset()

  /********************** message boards **********************/
  useMessageBoardFileLoader() // load `raydium-message-board.json`
  useMessageBoardReadedIdRecorder() // sync user's readedIds

  /********************** wallet **********************/

  // experimental features. will not let user see
  // useInitShadowKeypairs()
  useSyncWithSolanaWallet()
  useWalletConnectNotifaction()
  useTokenAccountsRefresher()
  useInitBalanceRefresher()
  useWalletAccountChangeListeners()

  /********************** token **********************/
  // application initializations
  useAutoUpdateSelectableTokens()
  useTokenListsLoader()
  useLpTokensLoader()
  useLpTokenMethodsLoad()
  useTokenPriceRefresher()
  useTokenMintAutoRecord()
  useTokenListSettingsLocalStorage()
  useTokenGetterFnLoader()

  /* ----- load liquidity info (jsonInfo, sdkParsedInfo, hydratedInfo) ----- */
  useLiquidityInfoLoader()

  /********************** pair Info (pools) **********************/
  usePoolsInfoLoader()

  /********************** farm **********************/
  useFarmInfoLoader()

  /********************** staking **********************/
  useStealDataFromFarm() // auto inject apr to farm info from backend pair interface

  /********************** txHistory **********************/
  useInitRefreshTransactionStatus()
  useSyncTxHistoryWithLocalStorage()
  return null
}
