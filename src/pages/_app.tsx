import React from 'react'
import { AppProps } from 'next/app'
import { useRouter } from 'next/router'

import NextNProgress from 'nextjs-progressbar'

import {
  useDeviceInfoSyc,
  useSentryConfigurator,
  useSlippageTolerenceSyncer,
  useSlippageTolerenceValidator,
  useThemeModeSync,
  useWelcomeDialog
} from '@/application/appSettings/initializationHooks'
import useConnectionInitialization from '@/application/connection/useConnectionInitialization'
import { useUserCustomizedEndpointInitLoad } from '@/application/connection/useUserCustomizedEndpointInitLoad'
import useFarmInfoFetcher from '@/application/farms/feature/useFarmInfoLoader'
import useInjectRaydiumFeeAprFromPair from '@/application/farms/feature/useInjectRaydiumFeeAprFromPair'
import useAutoFetchIdoDetail from '@/application/ido/feature/useAutoFetchIdoDetail'
import useLiquidityInfoLoader from '@/application/liquidity/feature/useLiquidityInfoLoader'
import useMessageBoardFileLoader from '@/application/messageBoard/useMessageBoardFileLoader'
import useMessageBoardReadedIdRecorder from '@/application/messageBoard/useMessageBoardReadedIdRecorder'
import usePoolsInfoLoader from '@/application/pools/usePoolsInfoLoader'
import { useAutoSyncUserAddedTokens } from '@/application/token/feature/useAutoSyncUserAddedTokens'
import useAutoUpdateSelectableTokens from '@/application/token/feature/useAutoUpdateSelectableTokens'
import { useLpTokenMethodsLoad } from '@/application/token/feature/useLpTokenMethodsLoad'
import useLpTokensLoader from '@/application/token/feature/useLpTokensLoader'
import useTokenMintAutoRecord from '@/application/token/feature/useTokenFlaggedMintAutoRecorder'
import useTokenListSettingsLocalStorage from '@/application/token/feature/useTokenListSettingsLocalStorage'
import useTokenListsLoader from '@/application/token/feature/useTokenListsLoader'
import useTokenPriceRefresher from '@/application/token/feature/useTokenPriceRefresher'
import useInitRefreshTransactionStatus from '@/application/txHistory/feature/useInitRefreshTransactionStatus'
import useSyncTxHistoryWithLocalStorage from '@/application/txHistory/feature/useSyncTxHistoryWithLocalStorage'
import useInitBalanceRefresher from '@/application/wallet/feature/useBalanceRefresher'
import { useSyncWithSolanaWallet } from '@/application/wallet/feature/useSyncWithSolanaWallet'
import useTokenAccountsRefresher from '@/application/wallet/feature/useTokenAccountsRefresher'
import { useWalletAccountChangeListeners } from '@/application/wallet/feature/useWalletAccountChangeListeners'
import RecentTransactionDialog from '@/components/dialogs/RecentTransactionDialog'
import WalletSelectorDialog from '@/components/dialogs/WalletSelectorDialog'
import NotificationSystemStack from '@/components/NotificationSystemStack'
import { SolanaWalletProviders } from '@/components/SolanaWallets/SolanaWallets'
import useHandleWindowTopError from '@/hooks/useHandleWindowTopError'

import '../styles/index.css'
import { useWalletConnectNotifaction } from '@/application/wallet/feature/useWalletConnectNotifaction'
import { useAppInitVersionPostHeartBeat, useJudgeAppVersion } from '@/application/appVersion/useAppVersion'
import { useTokenGetterFnLoader } from '@/application/token/feature/useTokenGetterFnLoader'
import { POPOVER_STACK_ID } from '@/components/Popover'
import { DRAWER_STACK_ID } from '@/components/Drawer'

export default function MyApp({ Component, pageProps }: AppProps) {
  const { pathname } = useRouter()
  return (
    <SolanaWalletProviders>
      {/* initializations hooks */}
      <ClientInitialization />
      {pathname !== '/' && <ApplicationsInitializations />}

      <div className="app">
        <NextNProgress color="#34ade5" showOnShallow={false} />

        {/* Page Components */}
        <Component {...pageProps} />

        {/* popup stack */}
        <div id={POPOVER_STACK_ID} className="fixed z-popover inset-0 self-pointer-events-none"></div>
        <div id={DRAWER_STACK_ID} className="fixed z-popover inset-0 self-pointer-events-none"></div>

        {/* Global Components */}
        <RecentTransactionDialog />
        <WalletSelectorDialog />
        <NotificationSystemStack />
      </div>
    </SolanaWalletProviders>
  )
}

function ClientInitialization() {
  useHandleWindowTopError()

  // sentry settings
  useSentryConfigurator()

  useThemeModeSync()

  useDeviceInfoSyc()

  // beta welcome dialogs
  useWelcomeDialog()

  return null
}

function ApplicationsInitializations() {
  useSlippageTolerenceValidator()
  useSlippageTolerenceSyncer()
  // TODO: it may load too much data in init action. should improve this in 0.0.2

  // load liquidity info (jsonInfo, sdkParsedInfo, hydratedInfo)
  useLiquidityInfoLoader()

  /********************** appVersion **********************/
  useAppInitVersionPostHeartBeat()
  useJudgeAppVersion()

  /********************** connection **********************/
  useUserCustomizedEndpointInitLoad()
  useConnectionInitialization()

  /********************** message boards **********************/
  useMessageBoardFileLoader() // load `raydium-message-board.json`
  useMessageBoardReadedIdRecorder() // sync user's readedIds

  /********************** wallet **********************/
  useSyncWithSolanaWallet()
  useWalletConnectNotifaction()
  useTokenAccountsRefresher()
  useInitBalanceRefresher()
  useWalletAccountChangeListeners()

  /********************** token **********************/
  // application initializations
  useAutoUpdateSelectableTokens()
  useAutoSyncUserAddedTokens()
  useTokenListsLoader()
  useLpTokensLoader()
  useLpTokenMethodsLoad()
  useTokenPriceRefresher()
  useTokenMintAutoRecord()
  useTokenListSettingsLocalStorage()
  useTokenGetterFnLoader()

  /********************** pariInfo(pools) **********************/
  usePoolsInfoLoader()

  /********************** farm **********************/
  useInjectRaydiumFeeAprFromPair() // auto inject apr to farm info from backend pair interface
  useFarmInfoFetcher()

  /********************** txHistory **********************/
  useInitRefreshTransactionStatus()
  useSyncTxHistoryWithLocalStorage()

  /********************** acceleraytor **********************/
  // useAutoFetchIdoInfo()
  useAutoFetchIdoDetail()
  return null
}
