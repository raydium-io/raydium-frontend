import React, { CSSProperties, ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/router'

import { ZERO } from '@raydium-io/raydium-sdk'

import { twMerge } from 'tailwind-merge'

import useAppSettings from '@/application/appSettings/useAppSettings'
import useConnection from '@/application/connection/useConnection'
import useNotification from '@/application/notification/useNotification'
import useWallet from '@/application/wallet/useWallet'
import { useWallet as useWalletAdapter, WalletContextState } from '@solana/wallet-adapter-react'
import jFetch from '@/functions/dom/jFetch'
import linkTo from '@/functions/dom/linkTo'
import { eq } from '@/functions/numberish/compare'
import { div, mul } from '@/functions/numberish/operations'
import { toString } from '@/functions/numberish/toString'
import useAsyncEffect from '@/hooks/useAsyncEffect'
import useAsyncMemo from '@/hooks/useAsyncMemo'
import useDocumentMetaTitle from '@/hooks/useDocumentMetaTitle'
import { LinkAddress } from '@/types/constants'

import { Badge } from './Badge'
import Button from './Button'
import Col from './Col'
import Drawer from './Drawer'
import { FadeIn } from './FadeIn'
import Grid from './Grid'
import Icon, { AppHeroIconName } from './Icon'
import Image from './Image'
import Input from './Input'
import Link from './Link'
import MessageBoardWidget from './navWidgets/MessageBoardWidget'
import WalletWidget from './navWidgets/WalletWidget'
import PageLayoutPopoverDrawer from './PageLayoutPopoverDrawer'
import Row from './Row'
import Tooltip from './Tooltip'
import LoadingCircle from './LoadingCircle'
import { setCssVarible } from '@/functions/dom/cssVariable'
import { inClient } from '@/functions/judgers/isSSR'
import { useAppVersion } from '@/application/appVersion/useAppVersion'
import { refreshWindow } from '@/application/appVersion/forceWindowRefresh'
import Card from './Card'
import Dialog from './Dialog'
import { toUTC } from '@/functions/date/dateFormat'
import { useForceUpdate } from '@/hooks/useForceUpdate'
import {
  IncomingThemeVariables,
  NotificationsButton,
  DialectContextProvider,
  Config,
  Backend,
  DialectWalletAdapter,
  DialectThemeProvider,
  DialectUiManagementProvider
} from '@dialectlabs/react-ui'
import { PublicKey } from '@solana/web3.js'

/**
 * for easier to code and read
 *
 * TEMP: add haveData to fix scrolling bug
 */
export default function PageLayout(props: {
  /** only mobile  */
  mobileBarTitle?: string
  metaTitle?: string
  children?: ReactNode
  className?: string
  contentClassName?: string
  topbarClassName?: string
  sideMenuClassName?: string

  contentYPaddingShorter?: boolean // it will set both contentTopPaddingShorter and contentButtonPaddingShorter
  contentButtonPaddingShorter?: boolean // it will cause content bottom padding shorter than usual
  contentTopPaddingShorter?: boolean // it will cause content top padding shorter than usual

  // showWalletWidget?: boolean
  // showRpcWidget?: boolean
  // showLanguageWidget?: boolean
}) {
  useDocumentMetaTitle(props.metaTitle)
  const isMobile = useAppSettings((s) => s.isMobile)
  const [isSideMenuOpen, setIsSideMenuOpen] = useState(false)
  return (
    <div
      style={{
        padding:
          'env(safe-area-inset-top, 0px) env(safe-area-inset-right, 0px) env(safe-area-inset-bottom, 0px) env(safe-area-inset-left, 0px)',
        position: 'relative',
        display: 'grid',
        gridTemplate: isMobile
          ? `
          "d" auto
          "a" auto
          "c" 1fr / 1fr`
          : `
          "d d d" auto
          "a a a" auto
          "b c c" 1fr
          "b c c" 1fr / auto 1fr 1fr`,
        overflow: 'hidden', // establish a BFC
        willChange: 'opacity'
      }}
      className={`w-full mobile:w-full h-full mobile:h-full`}
    >
      <RPCPerformanceBanner className="grid-area-d" />
      {isMobile ? (
        <>
          <Navbar barTitle={props.mobileBarTitle} className="grid-area-a" onOpenMenu={() => setIsSideMenuOpen(true)} />
          <Drawer open={isSideMenuOpen} onClose={() => setIsSideMenuOpen(false)} onOpen={() => setIsSideMenuOpen(true)}>
            {({ close }) => <SideMenu className="flex-container h-full" onClickCloseBtn={close} />}
          </Drawer>
        </>
      ) : (
        <>
          <Navbar className="grid-area-a" />
          <SideMenu className="flex-container grid-area-b" />
        </>
      )}
      <main
        // always occupy scrollbar space
        className={twMerge(
          `PageLayoutContent relative isolate flex-container grid-area-c bg-gradient-to-b from-[#0c0927] to-[#110d36] rounded-tl-3xl mobile:rounded-none p-12 ${
            props.contentButtonPaddingShorter ?? props.contentYPaddingShorter ? 'pb-4' : ''
          } ${props.contentTopPaddingShorter ?? props.contentYPaddingShorter ? 'pt-5' : ''} mobile:py-2 mobile:px-3`,
          props.contentClassName
        )}
        style={{
          overflowX: 'hidden',
          overflowY: 'scroll'
        }}
      >
        {/* do not check ata currently
        <MigrateBubble /> */}
        <VersionTooOldDialog />
        {props.children}
      </main>
    </div>
  )
}
function RPCPerformanceBanner({ className }: { className?: string }) {
  const { connection, currentEndPoint } = useConnection()
  const [isLowRpcPerformance, setIsLowRpcPerformance] = useState(false)

  const MAX_TPS = 1500 // force settings

  useAsyncEffect(async () => {
    if (isLowRpcPerformance) return // no need calc again
    if (!currentEndPoint?.url) return
    const result = await jFetch<{
      result: {
        numSlots: number
        numTransactions: number
        samplePeriodSecs: number
        slot: number
      }[]
    }>(currentEndPoint?.url, {
      method: 'post',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        id: 'getRecentPerformanceSamples',
        jsonrpc: '2.0',
        method: 'getRecentPerformanceSamples',
        params: [4]
      })
    })
    if (!result) return
    const blocks = result.result
    const perSecond = blocks.map(({ numTransactions }) => numTransactions / 60)
    const tps = perSecond.reduce((a, b) => a + b, 0) / perSecond.length

    setIsLowRpcPerformance(tps < MAX_TPS)
  }, [connection])

  return (
    <div className={className}>
      <FadeIn>
        {isLowRpcPerformance && (
          <div className="bg-[#dacc363f] text-center text-[#D8CB39] text-sm mobile:text-xs px-4 py-1">
            The Solana network is experiencing congestion or reduced performance. Transactions may fail to send or
            confirm.
          </div>
        )}
      </FadeIn>
    </div>
  )
}
function VersionTooOldDialog() {
  const versionRefreshData = useAppVersion((s) => s.versionFresh)
  return (
    <Dialog open={versionRefreshData === 'too-old'} canClosedByMask={false}>
      {({ close }) => (
        <Card
          className={twMerge(`p-8 rounded-3xl w-[min(480px,95vw)] mx-8 border-1.5 border-[rgba(171,196,255,0.2)]`)}
          size="lg"
          style={{
            background:
              'linear-gradient(140.14deg, rgba(0, 182, 191, 0.15) 0%, rgba(27, 22, 89, 0.1) 86.61%), linear-gradient(321.82deg, #18134D 0%, #1B1659 100%)',
            boxShadow: '0px 8px 48px rgba(171, 196, 255, 0.12)'
          }}
        >
          <Col className="items-center">
            <div className="font-semibold text-xl text-[#D8CB39] mb-3 text-center">New version available</div>
            <div className="text-center mt-2  mb-6 text-[#ABC4FF]">Refresh the page to update and use the app.</div>

            <div className="self-stretch">
              <Col>
                <Button
                  className={`text-[#ABC4FF]  frosted-glass-teal`}
                  onClick={() => refreshWindow({ noCache: true })}
                >
                  Refresh
                </Button>
                <Button className="text-[#ABC4FF]" type="text" onClick={close}>
                  Update later
                </Button>
              </Col>
            </div>
          </Col>
        </Card>
      )}
    </Dialog>
  )
}

function MigrateBubble() {
  const noNeedAtaTokenMints = useAsyncMemo(async () => (await jFetch('/no-ata-check-token-mints.json')) as string[])
  const rawTokenAccounts = useWallet((s) => s.allTokenAccounts)
  const connected = useWallet((s) => s.connected)

  const needMigrate = useMemo(() => {
    const isInWhiteList = (mint: string) => (noNeedAtaTokenMints ?? []).includes(String(mint))
    return rawTokenAccounts.some(
      (tokenAccount) =>
        !tokenAccount.isNative &&
        !tokenAccount.isAssociated &&
        !isInWhiteList(String(tokenAccount.mint)) &&
        tokenAccount.amount.gt(ZERO)
    )
  }, [rawTokenAccounts, noNeedAtaTokenMints])

  useEffect(() => {
    if (needMigrate) {
      useNotification.getState().logWarning(
        'You have old tokenAccount',
        <div>
          please click here to <Link href="https://v1.raydium.io/migrate/">migrate</Link> to new ATA account
        </div>
      )
    }
  }, [needMigrate])

  if (!connected) return null
  if (!noNeedAtaTokenMints) return null // haven't load data
  if (!needMigrate) return null

  return (
    <Grid className="pc:grid-cols-[auto,1fr,auto] mobile:grid-cols-[auto,1fr] gap-3 justify-between items-center py-6 px-8 mb-10 rounded-xl ring-1.5 ring-inset ring-[#DA2EEF] bg-[#1B1659]">
      <Icon className="text-[#DA2EEF] self-start mobile:row-span-2" heroIconName="exclamation-circle" />
      <Col className="gap-2">
        <div className="text-white text-base font-medium">You have old tokenAccount </div>
        <div className="text-[#C4D6FF] text-sm font-medium">
          Your wallet have old normal tokenAccount. Please migrate to ATA tokenAccount for safer transaction.
        </div>
      </Col>
      <Row className="gap-8">
        <Button
          className=" mobile:flex-grow frosted-glass-teal w-40"
          onClick={() => linkTo('https://v1.raydium.io/migrate/')}
        >
          Migrate
        </Button>
        <Button
          className=" mobile:flex-grow ring-1.5 ring-inset ring-current opacity-50 text-[#ABC4FF] text-sm font-medium"
          type="text"
          onClick={() => linkTo('https://raydium.gitbook.io/raydium/updates/associated-token-account-migration')}
        >
          Learn More
        </Button>
      </Row>
    </Grid>
  )
}

const RAYDIUM_MONITORING_PUBLIC_KEY = new PublicKey('21NkpAe9wQAmdVUSpDqjttu5Czisg1KfktmEpn44maco')

const RAYDIUM_NOTIFICATION_TYPES = [
  {
    name: 'Unstaked Ray Balances',
    detail: 'On Change'
  },
  {
    name: 'Unstaked LP tokens for pools',
    detail: 'On Change'
  },
  {
    name: 'New Farm launch',
    detail: 'On Launch'
  }
]

const walletToDialectWallet = (wallet: WalletContextState): DialectWalletAdapter => ({
  publicKey: wallet.publicKey!,
  connected: wallet.connected && !wallet.connecting && !wallet.disconnecting && Boolean(wallet.publicKey),
  signMessage: wallet.signMessage,
  signTransaction: wallet.signTransaction,
  signAllTransactions: wallet.signAllTransactions
})

function DialectNotificationsButton() {
  // Using original wallet adapter, since Dialect requires the original WalletContextState
  const wallet = useWalletAdapter()
  const isMobile = useAppSettings((s) => s.isMobile)
  const [dialectWalletAdapter, setDialectWalletAdapter] = useState<DialectWalletAdapter>(() =>
    walletToDialectWallet(wallet)
  )

  useEffect(() => {
    setDialectWalletAdapter(walletToDialectWallet(wallet))
  }, [wallet])

  const dialectConfig = useMemo(
    (): Config => ({
      backends: [Backend.DialectCloud],
      environment: 'production',
      dialectCloud: {
        tokenStore: 'local-storage'
      }
    }),
    []
  )

  const themeVariables: IncomingThemeVariables = useMemo(
    () => ({
      dark: {
        icons: {
          bell: ({ className }) => (
            <Icon
              size={isMobile ? 'smi' : 'md'}
              heroIconName="bell"
              className={twMerge(className, '!w-auto !h-auto')}
            />
          )
        },
        colors: {
          bg: 'bg-popup-bg',
          highlight: 'bg-[#FFFFFF]/5',
          primary: 'text-primary'
        },
        textStyles: {
          body: 'text-[#abc4ff] text-[0.9375rem]',
          header: 'text-[0.9375rem]',
          bigText: 'text-base',
          small: 'text-sm text-[#ABC4FF]'
        },
        bellButton:
          'text-[#ABC4FF] opacity-60 hover:opacity-75 clickable clickable-filter-effect clickable-mask-offset-3a !bg-transparent',
        modal: 'rounded-lg pc:!box-shadow-popup-white mobile:!box-shadow-none pt-1 !shadow-cyberpunk-card',
        modalWrapper: `fixed pc:h-[35rem] pc:w-[30rem] z-popover top-[5.5rem] right-auto -mr-4 mobile:mr-0 mobile:top-0 mobile:right-0 mobile:w-screen mobile:h-screen`,
        button:
          'Button px-4 py-2.5 rounded-xl mobile:rounded-lg whitespace-nowrap appearance-none inline-block font-medium bg-formkit-thumb text-formkit-thumb-text-normal clickable clickable-filter-effect !frosted-glass-teal mobile:py-2 mobile:text-xs',
        section: 'dt-p-2 dt-rounded-2xl dt-border dt-border-outline-night'
      }
    }),
    [isMobile]
  )

  return (
    <DialectContextProvider wallet={dialectWalletAdapter} config={dialectConfig} dapp={RAYDIUM_MONITORING_PUBLIC_KEY}>
      <DialectThemeProvider theme={'dark'} variables={themeVariables}>
        <DialectUiManagementProvider>
          <NotificationsButton dialectId="dialect-notifications" notifications={RAYDIUM_NOTIFICATION_TYPES} />
        </DialectUiManagementProvider>
      </DialectThemeProvider>
    </DialectContextProvider>
  )
}

function Navbar({
  barTitle,
  className,
  style,
  onOpenMenu
}: {
  className?: string
  barTitle?: string
  style?: CSSProperties
  // TODO: move it into useAppSetting()
  onOpenMenu?: () => void
}) {
  const isMobile = useAppSettings((s) => s.isMobile)
  const pcNavContent = (
    <Row className="justify-between items-center">
      <Link href="/">
        <Image className="cursor-pointer" src="/logo/logo-with-text.svg" />
      </Link>

      <Row className="gap-8 items-center">
        <DialectNotificationsButton />
        <WalletWidget />
      </Row>
    </Row>
  )
  const mobileNavContent = (
    <Grid className="grid-cols-3 items-center">
      <div className="frosted-glass-teal rounded-lg p-2 clickable justify-self-start" onClick={onOpenMenu}>
        <Icon className="w-4 h-4" iconClassName="w-4 h-4" iconSrc="/icons/msic-menu.svg" />
      </div>

      {barTitle ? (
        <div onClick={onOpenMenu} className="text-lg font-semibold place-self-center text-white -mb-1">
          {barTitle}
        </div>
      ) : (
        <Link className="place-self-center" href="/">
          <Image className="cursor-pointer" src="/logo/logo-only-icon.svg" />
        </Link>
      )}

      <Row className="gap-4 items-center justify-self-end">
        <DialectNotificationsButton />
        <WalletWidget />
      </Row>
    </Grid>
  )
  return (
    <nav
      className={twMerge('select-none text-white px-12 py-4 mobile:px-5 mobile:py-3 transition-all', className)}
      style={style}
    >
      {isMobile ? mobileNavContent : pcNavContent}
    </nav>
  )
}

function SideMenu({ className, onClickCloseBtn }: { className?: string; onClickCloseBtn?(): void }) {
  const { pathname } = useRouter()
  const isMobile = useAppSettings((s) => s.isMobile)
  const isInLocalhost = useAppSettings((s) => s.isInLocalhost)
  const sideMenuRef = useRef<HTMLDivElement>(null)
  const lastestVersion = useAppVersion((s) => s.lastest)
  const currentVersion = useAppVersion((s) => s.currentVersion)

  useEffect(() => {
    if (!inClient) return
    setCssVarible(
      globalThis.document.documentElement,
      '--side-menu-width',
      sideMenuRef.current ? Math.min(sideMenuRef.current.clientWidth, sideMenuRef.current.clientHeight) : 0
    )
  }, [sideMenuRef])

  return (
    <>
      <Col
        domRef={sideMenuRef}
        className={twMerge(
          `h-full overflow-y-auto w-56 mobile:w-48 mobile:rounded-tr-2xl mobile:rounded-br-2xl`,
          className
        )}
        style={{
          background: isMobile
            ? 'linear-gradient(242.18deg, rgba(57, 208, 216, 0.08) 68.05%, rgba(57, 208, 216, 0.02) 86.71%), #0C0926'
            : undefined,
          boxShadow: isMobile ? '8px 0px 48px rgba(171, 196, 255, 0.12)' : undefined
        }}
      >
        {isMobile && (
          <Row className="items-center justify-between p-6 mobile:p-4 mobile:pl-8">
            <Link href="/">
              <Image src="/logo/logo-with-text.svg" className="mobile:scale-75" />
            </Link>
            <Icon
              size={isMobile ? 'sm' : 'md'}
              heroIconName="x"
              className="text-[rgba(57,208,216,0.8)] clickable clickable-mask-offset-2"
              onClick={onClickCloseBtn}
            />
          </Row>
        )}
        <Col className="grid grid-rows-[2fr,1fr,auto] flex-1 overflow-hidden">
          <div className="shrink overflow-y-auto min-h-[120px] py-4 space-y-1 mobile:py-0 px-2 mr-2 mobile:ml-2 mb-2">
            <LinkItem icon="/icons/entry-icon-trade.svg" href="https://dex.raydium.io/">
              Trading
            </LinkItem>
            <LinkItem icon="/icons/entry-icon-swap.svg" href="/swap" isCurrentRoutePath={pathname.includes('swap')}>
              Swap
            </LinkItem>
            <LinkItem
              icon="/icons/entry-icon-liquidity.svg"
              href="/liquidity/add"
              isCurrentRoutePath={pathname.includes('liquidity')}
            >
              Liquidity
            </LinkItem>
            <LinkItem icon="/icons/entry-icon-pools.svg" href="/pools" isCurrentRoutePath={pathname.includes('pools')}>
              Pools
            </LinkItem>
            <LinkItem icon="/icons/entry-icon-farms.svg" href="/farms" isCurrentRoutePath={pathname.includes('farms')}>
              Farms
            </LinkItem>
            <LinkItem
              icon="/icons/entry-icon-staking.svg"
              href="/staking"
              isCurrentRoutePath={pathname.includes('staking')}
            >
              Staking
            </LinkItem>
            <LinkItem icon="/icons/entry-icon-acceleraytor.svg" href="/acceleraytor/list">
              AcceleRaytor
            </LinkItem>
            {isInLocalhost && (
              <LinkItem icon="/icons/entry-icon-acceleraytor.svg" href="/acceleraytor/basement">
                Basement
              </LinkItem>
            )}
            <LinkItem icon="/icons/entry-icon-dropzone.svg" href="https://dropzone.raydium.io/">
              Dropzone
            </LinkItem>
            <LinkItem icon="/icons/entry-icon-nft.svg" href="https://nft.raydium.io/">
              NFT
            </LinkItem>
          </div>

          <Col className="overflow-scroll no-native-scrollbar">
            <div className="mx-8 border-b border-[rgba(57,208,216,0.16)] my-2 mobile:my-1"></div>
            <div className="flex-1 overflow-auto no-native-scrollbar mt-2">
              <RpcConnectionPanelSidebarWidget />
              <SettingSidebarWidget />
              <CommunityPanelSidebarWidget />

              <OptionItem noArrow href="https://raydium.gitbook.io/raydium/" iconSrc="/icons/msic-docs.svg">
                Docs
              </OptionItem>

              <OptionItem noArrow href="https://v1.raydium.io/swap" heroIconName="desktop-computer">
                Raydium V1
              </OptionItem>

              <OptionItem noArrow href="https://forms.gle/DvUS4YknduBgu2D7A" iconSrc="/icons/misc-feedback.svg">
                Feedback
              </OptionItem>
            </div>
          </Col>

          <Tooltip>
            <div className="text-sm m-2 mb-0 leading-relaxed opacity-50 hover:opacity-100 transition font-medium text-[#abc4ff] whitespace-nowrap cursor-default">
              <div>V {currentVersion.slice(1)}</div>
              <div>
                <BlockTimeClock />
              </div>
            </div>
            <Tooltip.Panel>
              <div className="text-xs m-2 leading-relaxed font-medium text-[#abc4ff] whitespace-nowrap cursor-default">
                <div>Current: {currentVersion}</div>
                <div>Lastest: {lastestVersion}</div>
                <div>Block time: {<BlockTimeClock showSeconds />}</div>
              </div>
            </Tooltip.Panel>
          </Tooltip>
        </Col>
      </Col>
    </>
  )
}

function BlockTimeClock({ showSeconds, hideUTCBadge }: { showSeconds?: boolean; hideUTCBadge?: boolean }) {
  const chainTimeOffset = useConnection((s) => s.chainTimeOffset)
  useForceUpdate({ loop: 1000 })
  return (
    <div className="inline-block">
      {chainTimeOffset != null ? toUTC(Date.now() + chainTimeOffset, { showSeconds, hideUTCBadge }) : undefined}
    </div>
  )
}
function LinkItem({
  children,
  href,
  icon,
  isCurrentRoutePath
}: {
  children?: ReactNode
  href?: string
  icon?: string
  isCurrentRoutePath?: boolean
}) {
  const isInnerLink = href?.startsWith('/')
  const isExternalLink = !isInnerLink
  const isMobile = useAppSettings((s) => s.isMobile)
  return (
    <Link
      href={href}
      noTextStyle
      className={`group block py-2.5 mobile:py-2 px-4 mobile:px-1 rounded-xl mobile:rounded-lg hover:bg-[rgba(57,208,216,0.05)] ${
        isCurrentRoutePath ? 'bg-[rgba(57,208,216,0.1)]' : ''
      }`}
    >
      <Row className="items-center">
        <div className="grid bg-gradient-to-br from-[rgba(57,208,216,0.2)] to-[rgba(57,208,216,0)] rounded-lg p-1.5 mr-3">
          <Icon size={isMobile ? 'xs' : 'sm'} iconSrc={icon} />
        </div>
        <Row
          className={`grow items-center justify-between text-[#ACE3E5] ${
            isCurrentRoutePath ? 'text-[rgba(57,208,216,1)]' : ''
          } text-sm mobile:text-xs font-medium`}
        >
          <div>{children}</div>
          {isExternalLink && (
            <Icon inline className="opacity-80" size={isMobile ? 'xs' : 'sm'} heroIconName="external-link" />
          )}
        </Row>
      </Row>
    </Link>
  )
}

function OptionItem({
  noArrow,
  children,
  iconSrc,
  heroIconName,
  href,
  onClick
}: {
  noArrow?: boolean
  children: ReactNode
  iconSrc?: string
  heroIconName?: AppHeroIconName
  href?: LinkAddress
  onClick?(): void
}) {
  const isMobile = useAppSettings((s) => s.isMobile)
  return (
    <Link
      href={href}
      noTextStyle
      className="block py-3 mobile:py-3 px-8 pl-6 mobile:px-5 hover:bg-[rgba(57,208,216,0.1)] active:bg-[rgba(41,157,163,0.3)] cursor-pointer group"
    >
      <Row className="items-center w-full mobile:justify-center" onClick={onClick}>
        <Icon
          className="mr-3 text-[rgba(57,208,216,1)]"
          size={isMobile ? 'xs' : 'sm'}
          iconSrc={iconSrc}
          heroIconName={heroIconName}
        />
        <span
          className={`text-[#ACE3E5] text-sm mobile:text-xs font-medium flex-grow ${
            href ? 'group-hover:text-[rgba(57,208,216,1)]' : ''
          }`}
        >
          {children}
        </span>
        {!noArrow && <Icon size={isMobile ? 'xs' : 'sm'} heroIconName="chevron-right" iconClassName="text-[#ACE3E6]" />}
      </Row>
    </Link>
  )
}

function SettingSidebarWidget() {
  return (
    <PageLayoutPopoverDrawer renderPopoverContent={<SettingPopover />}>
      <OptionItem iconSrc="/icons/msic-settings.svg">Settings</OptionItem>
    </PageLayoutPopoverDrawer>
  )
}

function SettingPopover() {
  const slippageTolerance = useAppSettings((s) => s.slippageTolerance)
  const slippageToleranceState = useAppSettings((s) => s.slippageToleranceState)
  return (
    <div className="py-5 px-6">
      <Row className="items-center mb-3 mobile:mb-6 gap-2">
        <div className="text-[rgba(171,196,255,0.5)] text-xs mobile:text-sm">SLIPPAGE TOLERANCE</div>
        <Tooltip placement="bottom-right">
          <Icon size="sm" heroIconName="question-mark-circle" className="cursor-help text-[rgba(171,196,255,0.5)]" />
          <Tooltip.Panel>The maximum difference between your estimated price and execution price</Tooltip.Panel>
        </Tooltip>
      </Row>
      <Row className="gap-3 justify-between">
        <div
          className={`py-1 px-3 bg-[#141041] rounded-full text-[#F1F1F2] font-medium text-sm ${
            eq(slippageTolerance, 0.001) ? 'ring-1 ring-inset ring-[#39D0D8]' : ''
          } cursor-pointer`}
          onClick={() => {
            useAppSettings.setState({ slippageTolerance: '0.001' })
          }}
        >
          0.1%
        </div>
        <div
          className={`py-1 px-3 bg-[#141041] rounded-full text-[#F1F1F2] font-medium text-sm ${
            eq(slippageTolerance, 0.005) ? 'ring-1 ring-inset ring-[#39D0D8]' : ''
          } cursor-pointer`}
          onClick={() => {
            useAppSettings.setState({ slippageTolerance: '0.005' })
          }}
        >
          0.5%
        </div>
        <div
          className={`py-1 px-3 bg-[#141041] rounded-full text-[#F1F1F2] font-medium text-sm ${
            eq(slippageTolerance, 0.01) ? 'ring-1 ring-inset ring-[#39D0D8]' : ''
          } cursor-pointer`}
          onClick={() => {
            useAppSettings.setState({ slippageTolerance: '0.01' })
          }}
        >
          1%
        </div>
        <div
          className={`py-1 px-3 bg-[#141041] rounded-full text-[#F1F1F2] font-medium text-sm ${
            !(eq(slippageTolerance, 0.001) || eq(slippageTolerance, 0.005) || eq(slippageTolerance, 0.01))
              ? 'ring-1 ring-inset ring-[#39D0D8]'
              : ''
          }`}
        >
          <Row>
            <Input
              className="w-[32px]"
              value={toString(mul(slippageTolerance, 100), { decimalLength: 'auto 2' })}
              onUserInput={(value) => {
                const n = div(parseFloat(value || '0'), 100)
                if (n) {
                  useAppSettings.setState({ slippageTolerance: n })
                }
              }}
              pattern={/^\d*\.?\d*$/}
            />
            <div>%</div>
          </Row>
        </div>
      </Row>
      {(slippageToleranceState === 'invalid' || slippageToleranceState === 'too small') && (
        <div
          className={`mt-4 mobile:mt-6 ${
            slippageToleranceState === 'invalid' ? 'text-[#DA2EEF]' : 'text-[#D8CB39]'
          } text-xs mobile:text-sm`}
        >
          {slippageToleranceState === 'invalid'
            ? 'Please enter a valid slippage percentage'
            : 'Your transaction may fail'}
        </div>
      )}
    </div>
  )
}

function CommunityPanelSidebarWidget() {
  return (
    <PageLayoutPopoverDrawer renderPopoverContent={<CommunityPopover />}>
      <OptionItem iconSrc="/icons/msic-community.svg">Community</OptionItem>
    </PageLayoutPopoverDrawer>
  )
}

function CommunityPopover() {
  function Item({
    text,
    iconSrc,
    href,
    onClick
  }: {
    text: string
    iconSrc: string
    href?: LinkAddress
    onClick?: (payload: { text: string; iconSrc: string; href?: LinkAddress }) => void
  }) {
    return (
      <Row
        className="gap-3 py-4 pl-4 pr-12 cursor-pointer"
        onClick={() => {
          if (href) linkTo(href)
          onClick?.({ text, iconSrc, href })
        }}
      >
        <Icon iconSrc={iconSrc} />
        <Link href={href} className="text-white">
          {text}
        </Link>
      </Row>
    )
  }

  return (
    <>
      <div className="pt-3 -mb-1 mobile:mb-2 px-6 text-[rgba(171,196,255,0.5)] text-xs mobile:text-sm">COMMUNITY</div>
      <div className="gap-3 divide-y-1.5 divide-[rgba(171,196,255,0.2)] ">
        <Item href="https://twitter.com/RaydiumProtocol" iconSrc="/icons/media-twitter.svg" text="Twitter" />
        <Item href="https://discord.gg/raydium" iconSrc="/icons/media-discord.svg" text="Discord" />
        <PageLayoutPopoverDrawer
          renderPopoverContent={({ close }) => (
            <Col className="divide-y-1.5 max-h-[60vh] overflow-auto divide-[rgba(171,196,255,0.2)]">
              <Item
                href="https://t.me/raydiumprotocol"
                iconSrc="/icons/media-telegram.svg"
                text="Telegram (EN)"
                onClick={close}
              />
              <Item
                href="https://t.me/RaydiumChina"
                iconSrc="/icons/media-telegram.svg"
                text="Telegram (CN)"
                onClick={close}
              />
              <Item
                href="https://t.me/raydiumkorea"
                iconSrc="/icons/media-telegram.svg"
                text="Telegram (KR)"
                onClick={close}
              />
              <Item
                href="https://t.me/raydiumjapan"
                iconSrc="/icons/media-telegram.svg"
                text="Telegram (JP)"
                onClick={close}
              />
              <Item
                href="https://t.me/RaydiumSpanish"
                iconSrc="/icons/media-telegram.svg"
                text="Telegram (ES)"
                onClick={close}
              />
              <Item
                href="https://t.me/RaydiumTurkey"
                iconSrc="/icons/media-telegram.svg"
                text="Telegram (TR)"
                onClick={close}
              />
              <Item
                href="https://t.me/RaydiumVietnam"
                iconSrc="/icons/media-telegram.svg"
                text="Telegram (VN)"
                onClick={close}
              />
              <Item
                href="https://t.me/RaydiumRussian"
                iconSrc="/icons/media-telegram.svg"
                text="Telegram (RU)"
                onClick={close}
              />
              <Item
                href="https://t.me/raydiumthailand"
                iconSrc="/icons/media-telegram.svg"
                text="Telegram (TH)"
                onClick={close}
              />
            </Col>
          )}
        >
          <Row className="flex items-center justify-between">
            <Item iconSrc="/icons/media-telegram.svg" text="Telegram" />
            <Icon
              heroIconName="chevron-right"
              size="sm"
              className="justify-self-end m-2 text-[rgba(171,196,255,0.5)]"
            />
          </Row>
        </PageLayoutPopoverDrawer>

        <Item href="https://raydium.medium.com/" iconSrc="/icons/media-medium.svg" text="Medium" />
      </div>
    </>
  )
}

function RpcConnectionPanelSidebarWidget() {
  return (
    <PageLayoutPopoverDrawer renderPopoverContent={({ close }) => <RpcConnectionPanelPopover close={close} />}>
      <RpcConnectionFace />
    </PageLayoutPopoverDrawer>
  )
}

function RpcConnectionFace() {
  const currentEndPoint = useConnection((s) => s.currentEndPoint)
  const isLoading = useConnection((s) => s.isLoading)
  const loadingCustomizedEndPoint = useConnection((s) => s.loadingCustomizedEndPoint)
  const extractConnectionName = useConnection((s) => s.extractConnectionName)
  const isMobile = useAppSettings((s) => s.isMobile)

  return (
    <div className="block py-4 mobile:py-3 px-8 pl-6 mobile:px-5 hover:bg-[rgba(57,208,216,0.1)] active:bg-[rgba(41,157,163,0.3)] cursor-pointer group">
      <Row className="items-center w-full mobile:justify-center">
        <div className="h-4 w-4 mobile:w-3 mobile:h-3 grid place-items-center mr-3 ">
          {isLoading ? (
            <Icon iconClassName="h-4 w-4 mobile:w-3 mobile:h-3" iconSrc="/icons/loading-dual.svg" />
          ) : (
            <div
              className={`w-1.5 h-1.5 mobile:w-1 mobile:h-1 bg-[#2de680] text-[#2de680] rounded-full`}
              style={{
                boxShadow: '0 0 6px 1px currentColor'
              }}
            />
          )}
        </div>
        <span
          className="text-[rgba(172,227,229)] text-sm mobile:text-xs font-medium flex-grow overflow-ellipsis overflow-hidden"
          title={currentEndPoint?.url}
        >
          {currentEndPoint
            ? isLoading
              ? `RPC (${
                  (loadingCustomizedEndPoint?.name ?? extractConnectionName(loadingCustomizedEndPoint?.url ?? '')) || ''
                })`
              : `RPC (${(currentEndPoint?.name ?? extractConnectionName(currentEndPoint.url)) || ''})`
            : '--'}
        </span>
        <Icon size={isMobile ? 'xs' : 'sm'} heroIconName="chevron-right" iconClassName="text-[#ACE3E6]" />
      </Row>
    </div>
  )
}
function RpcConnectionPanelPopover({ close: closePanel }: { close: () => void }) {
  const availableEndPoints = useConnection((s) => s.availableEndPoints)
  const currentEndPoint = useConnection((s) => s.currentEndPoint)
  const autoChoosedEndPoint = useConnection((s) => s.autoChoosedEndPoint)
  const userCostomizedUrlText = useConnection((s) => s.userCostomizedUrlText)
  const switchConnectionFailed = useConnection((s) => s.switchConnectionFailed)
  const switchRpc = useConnection((s) => s.switchRpc)
  const deleteRpc = useConnection((s) => s.deleteRpc)
  const isLoading = useConnection((s) => s.isLoading)
  const isMobile = useAppSettings((s) => s.isMobile)

  return (
    <>
      <div className="pt-3 -mb-1 mobile:mb-2 px-6 mobile:px-3 text-[rgba(171,196,255,0.5)] text-xs mobile:text-sm">
        RPC CONNECTION
      </div>
      <div className="gap-3 divide-y-1.5">
        {availableEndPoints.map((endPoint) => {
          const isCurrentEndPoint = currentEndPoint?.url === endPoint.url
          return (
            <Row
              key={endPoint.url}
              className="group flex-wrap gap-3 py-4 px-6 mobile:px-3 border-[rgba(171,196,255,0.05)]"
              onClick={() => {
                if (endPoint.url !== currentEndPoint?.url) {
                  switchRpc(endPoint).then((result) => {
                    if (result === true) {
                      closePanel()
                    }
                  })
                }
              }}
            >
              <Row className="items-center w-full">
                <Row
                  className={`${
                    isCurrentEndPoint
                      ? 'text-[rgba(255,255,255,0.85)]'
                      : 'hover:text-white active:text-white text-white cursor-pointer'
                  } items-center w-full`}
                >
                  {endPoint.name ?? '--'}
                  {endPoint.url === autoChoosedEndPoint?.url && <Badge className="self-center ml-2">recommended</Badge>}
                  {endPoint.isUserCustomized && (
                    <Badge className="self-center ml-2" cssColor="#c4d6ff">
                      user added
                    </Badge>
                  )}
                  {isCurrentEndPoint && (
                    <Icon
                      className="justify-self-end ml-auto text-[rgba(255,255,255,0.85)] clickable  transition"
                      iconClassName="ml-6"
                      heroIconName="check"
                    ></Icon>
                  )}
                  {endPoint.isUserCustomized && !isCurrentEndPoint && (
                    <Icon
                      className="justify-self-end ml-auto text-red-600 clickable opacity-0 group-hover:opacity-100 transition"
                      iconClassName="ml-6"
                      heroIconName="trash"
                      onClick={({ ev }) => {
                        deleteRpc(endPoint.url)
                        ev.stopPropagation()
                      }}
                    ></Icon>
                  )}
                </Row>
                {isLoading && endPoint === currentEndPoint && (
                  <Icon className="ml-3" iconClassName="h-4 w-4" iconSrc="/icons/loading-dual.svg" />
                )}
              </Row>
            </Row>
          )
        })}

        <Row className="border-[rgba(171,196,255,0.05)] items-center gap-3 p-4 mobile:py-4 mobile:px-2">
          <Input
            value={userCostomizedUrlText}
            className={`px-2 py-2 border-1.5 flex-grow ${
              switchConnectionFailed
                ? 'border-[#DA2EEF]'
                : userCostomizedUrlText === currentEndPoint?.url
                ? 'border-[rgba(196,214,255,0.8)]'
                : 'border-[rgba(196,214,255,0.2)]'
            } rounded-xl min-w-[7em]`}
            inputClassName="font-medium text-[rgba(196,214,255,0.5)] placeholder-[rgba(196,214,255,0.5)]"
            placeholder="https://"
            onUserInput={(searchText) => {
              useConnection.setState({ userCostomizedUrlText: searchText })
            }}
            onEnter={() => {
              switchRpc({ url: userCostomizedUrlText }).then((isSuccess) => {
                if (isSuccess === true) {
                  closePanel()
                }
              })
            }}
          />
          <Button
            className="frosted-glass-teal"
            onClick={() => {
              switchRpc({ url: userCostomizedUrlText }).then((isSuccess) => {
                if (isSuccess === true) {
                  closePanel()
                }
              })
            }}
          >
            Switch
          </Button>
        </Row>
      </div>
    </>
  )
}
