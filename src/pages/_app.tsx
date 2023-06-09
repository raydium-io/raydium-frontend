import { AppProps } from 'next/app'
import { useRouter } from 'next/router'

import { PublicKey } from '@solana/web3.js'

import NextNProgress from 'nextjs-progressbar'

import useAutoCleanSwapInfoCache from '@/application/ammV3PoolInfoAndLiquidity/useAutoCleanLiquidityInfoCache'
import { useClientInitialization, useInnerAppInitialization } from '@/application/common/initializationHooks'
import { useAppInitVersionPostHeartBeat, useJudgeAppVersion } from '@/application/common/useAppVersion'
import { useConcentratedAprCalcMethodSyncer } from '@/application/concentrated/useConcentratedAprCalcMethodSyncer'
import useConcentratedInfoLoader from '@/application/concentrated/useConcentratedInfoLoader'
import useConnectionInitialization from '@/application/connection/useConnectionInitialization'
import useFreshChainTimeOffset from '@/application/connection/useFreshChainTimeOffset'
import { useUserCustomizedEndpointInitLoad } from '@/application/connection/useUserCustomizedEndpointInitLoad'
import useFarmInfoLoader from '@/application/farms/useFarmInfoLoader'
import useAutoCleanLiquidityInfoCache from '@/application/liquidity/useAutoCleanLiquidityInfoCache'
import useLiquidityInfoLoader from '@/application/liquidity/useLiquidityInfoLoader'
import useMessageBoardFileLoader from '@/application/messageBoard/useMessageBoardFileLoader'
import useMessageBoardReadedIdRecorder from '@/application/messageBoard/useMessageBoardReadedIdRecorder'
import usePoolsInfoLoader from '@/application/pools/usePoolsInfoLoader'
import useStealDataFromFarm from '@/application/staking/useStealDataFromFarm'
import useAutoUpdateSelectableTokens from '@/application/token/useAutoUpdateSelectableTokens'
import useLpTokensLoader from '@/application/token/useLpTokensLoader'
import useTokenMintAutoRecord from '@/application/token/useTokenFlaggedMintAutoRecorder'
import { useTokenGetterFnLoader } from '@/application/token/useTokenGetterFnLoader'
import useTokenListSettingsLocalStorage from '@/application/token/useTokenListSettingsLocalStorage'
import useTokenListsLoader from '@/application/token/useTokenListsLoader'
import useTokenPriceRefresher from '@/application/token/useTokenPriceRefresher'
import useInitRefreshTransactionStatus from '@/application/txHistory/useInitRefreshTransactionStatus'
import useSyncTxHistoryWithLocalStorage from '@/application/txHistory/useSyncTxHistoryWithLocalStorage'
import useInitBalanceRefresher from '@/application/wallet/useBalanceRefresher'
import { useSyncWithSolanaWallet } from '@/application/wallet/useSyncWithSolanaWallet'
import useTokenAccountsRefresher from '@/application/wallet/useTokenAccountsRefresher'
import { useWalletAccountChangeListeners } from '@/application/wallet/useWalletAccountChangeListeners'
import { useWalletConnectNotifaction } from '@/application/wallet/useWalletConnectNotifaction'
import { useWalletTxVersionDetector } from '@/application/wallet/useWalletTxVersionDetector'
import { DRAWER_STACK_ID } from '@/components/Drawer'
import NotificationSystemStack from '@/components/NotificationSystemStack'
import { POPOVER_STACK_ID } from '@/components/Popover'
import { SolanaWalletProviders } from '@/components/SolanaWallets/SolanaWallets'
import { createDOMElement } from '@/functions/dom/createDOMElement'
import toPubString from '@/functions/format/toMintString'
import { inClient } from '@/functions/judgers/isSSR'
import { useIsomorphicLayoutEffect } from '@/hooks/useIsomorphicLayoutEffect'
import RecentTransactionDialog from '@/pageComponents/dialogs/RecentTransactionDialog'
import WalletSelectorDialog from '@/pageComponents/dialogs/WalletSelectorDialog'

import '../styles/index.css'
import { useCLMMMigrationLoadInfo } from '@/application/clmmMigration/useCLMMMigrationLoadInfo'

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
  useClientInitialization()

  return null
}

function ApplicationsInitializations() {
  useInnerAppInitialization()

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
  // useWalletTxVersionDetector() // TEMP DON'T OPEN THIS FEATURE
  useTokenAccountsRefresher()
  useInitBalanceRefresher()
  useWalletAccountChangeListeners()

  /********************** token **********************/
  // application initializations
  useAutoUpdateSelectableTokens()
  useTokenListsLoader()
  useLpTokensLoader()
  useTokenPriceRefresher()
  useTokenMintAutoRecord()
  useTokenListSettingsLocalStorage()
  useTokenGetterFnLoader()

  /* ----- load liquidity info (jsonInfo, sdkParsedInfo, hydratedInfo) ----- */
  useLiquidityInfoLoader()
  useAutoCleanLiquidityInfoCache()
  useAutoCleanSwapInfoCache()

  /********************** pair Info (pools) **********************/
  usePoolsInfoLoader()

  /********************** concentrated pools **********************/
  useConcentratedInfoLoader()
  useConcentratedAprCalcMethodSyncer()

  /********************** concentrated migration **********************/
  useCLMMMigrationLoadInfo()

  /********************** farm **********************/
  useFarmInfoLoader()

  /********************** staking **********************/
  useStealDataFromFarm() // auto inject apr to farm info from backend pair interface

  /********************** txHistory **********************/
  useInitRefreshTransactionStatus()
  useSyncTxHistoryWithLocalStorage()
  return null
}
