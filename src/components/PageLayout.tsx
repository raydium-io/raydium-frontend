import React, { CSSProperties, ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/router'

import { ZERO } from '@raydium-io/raydium-sdk'

import { twMerge } from 'tailwind-merge'

import { refreshWindow } from '@/application/common/forceWindowRefresh'
import useAppSettings from '@/application/common/useAppSettings'
import { useAppVersion } from '@/application/common/useAppVersion'
import { extractRPCName } from '@/application/connection/extractRPCName'
import useConnection from '@/application/connection/useConnection'
import useNotification from '@/application/notification/useNotification'
import useWallet from '@/application/wallet/useWallet'
import { toUTC } from '@/functions/date/dateFormat'
import { setCssVarible } from '@/functions/dom/cssVariable'
import jFetch from '@/functions/dom/jFetch'
import { setLocalItem } from '@/functions/dom/jStorage'
import linkTo from '@/functions/dom/linkTo'
import { isString } from '@/functions/judgers/dateType'
import { inClient } from '@/functions/judgers/isSSR'
import useAsyncMemo from '@/hooks/useAsyncMemo'
import useDocumentMetaTitle from '@/hooks/useDocumentMetaTitle'
import { useForceUpdate } from '@/hooks/useForceUpdate'
import { useUrlQuery } from '@/hooks/useUrlQuery'
import SetExplorer from '@/pageComponents/settings/SetExplorer'
import SetTolerance from '@/pageComponents/settings/SetTolerance'
import { LinkAddress } from '@/types/constants'

import { Badge } from './Badge'
import Button from './Button'
import Card from './Card'
import { Checkbox } from './Checkbox'
import Col from './Col'
import Dialog from './Dialog'
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
import ResponsiveDialogDrawer from './ResponsiveDialogDrawer'
import Row from './Row'
import Tooltip from './Tooltip'
import { TxVersionWidget } from './navWidgets/TxVersionWidget'

/**
 * for easier to code and read
 *
 * TEMP: add haveData to fix scrolling bug
 */
export default function PageLayout(props: {
  /** only mobile  */
  mobileBarTitle?:
    | string
    | {
        items: DropdownTitleInfoItem[]
        currentValue?: string
        onChange?: (value: string) => void
        urlSearchQueryKey?: string
        drawerTitle?: string
      }
  metaTitle?: string
  children?: ReactNode
  contentBanner?: ReactNode
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
          <Navbar className="grid-area-a" barTitle={props.mobileBarTitle} onOpenMenu={() => setIsSideMenuOpen(true)} />
          <Drawer open={isSideMenuOpen} onClose={() => setIsSideMenuOpen(false)} onOpen={() => setIsSideMenuOpen(true)}>
            {({ close }) => <SideMenu className="flex-container h-full" onClickCloseBtn={close} />}
          </Drawer>
        </>
      ) : (
        <>
          <Navbar className="grid-area-a" />
          <SideMenu className="flex-container grid-area-b mobile:hidden" />
        </>
      )}
      <main
        // always occupy scrollbar space
        className="flex flex-col PageLayoutContent relative grid-area-c bg-gradient-to-b from-[#0c0927] to-[#110d36] rounded-tl-3xl mobile:rounded-none"
        style={{
          overflowX: 'hidden',
          overflowY: 'scroll'
        }}
      >
        {props.contentBanner}
        {/* do not check ata currently
        <MigrateBubble /> */}
        <VersionTooOldDialog />
        <DisclaimerDialog />
        <div
          className={twMerge(
            `grow h-0 isolate flex-container p-12 ${
              props.contentButtonPaddingShorter ?? props.contentYPaddingShorter ? 'pb-4' : ''
            } ${props.contentTopPaddingShorter ?? props.contentYPaddingShorter ? 'pt-5' : ''} mobile:py-2 mobile:px-3`,
            props.contentClassName
          )}
        >
          {props.children}
        </div>
      </main>
    </div>
  )
}
function RPCPerformanceBanner({ className }: { className?: string }) {
  const isLowRpcPerformance = useAppSettings((s) => s.isLowRpcPerformance)

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
  const isInBonsaiTest = useAppSettings((s) => s.isInBonsaiTest)
  const isInLocalhost = useAppSettings((s) => s.isInLocalhost)
  if (isInBonsaiTest || isInLocalhost) return null
  return (
    <Dialog open={versionRefreshData === 'too-old' && !isInLocalhost && !isInBonsaiTest} canClosedByMask={false}>
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
function DisclaimerDialog() {
  const needPopDisclaimer = useAppSettings((s) => s.needPopDisclaimer)
  const [userHaveClickedAgree, setUserHaveClickedAgree] = useState(false)
  const confirmDisclaimer = () => {
    useAppSettings.setState({ needPopDisclaimer: false })
    setLocalItem<boolean>('USER_AGREE_DISCLAIMER', true)
  }
  return (
    <ResponsiveDialogDrawer
      maskNoBlur
      placement="from-bottom"
      open={Boolean(needPopDisclaimer)}
      canClosedByMask={false}
    >
      <Card
        className={twMerge(
          `flex flex-col p-8 mobile:p-5 rounded-3xl mobile:rounded-b-none mobile:h-[80vh] w-[min(552px,100vw)] mobile:w-full border-1.5 border-[rgba(171,196,255,0.2)]`
        )}
        size="lg"
        style={{
          background:
            'linear-gradient(140.14deg, rgba(0, 182, 191, 0.15) 0%, rgba(27, 22, 89, 0.1) 86.61%), linear-gradient(321.82deg, #18134D 0%, #1B1659 100%)',
          boxShadow: '0px 8px 48px rgba(171, 196, 255, 0.12)'
        }}
      >
        {/* title */}
        <div className="text-xl font-semibold text-white">Disclaimer</div>

        {/* content */}
        <div className="grow text-sm leading-normal text-[#abc4ffb3] scrollbar-width-thin overflow-auto h-96 mobile:h-12 rounded p-4 my-6 mobile:my-4 bg-[#141041]">
          <p className="mb-3">
            This website-hosted user interface (this "Interface") is an open source frontend software portal to the
            Raydium protocol, a decentralized and community-driven collection of blockchain-enabled smart contracts and
            tools (the "Raydium Protocol"). This Interface and the Raydium Protocol are made available by the Raydium
            Holding Foundation, however all transactions conducted on the protocol are run by related permissionless
            smart contracts. As the Interface is open-sourced and the Raydium Protocol and its related smart contracts
            are accessible by any user, entity or third party, there are a number of third party web and mobile
            user-interfaces that allow for interaction with the Raydium Protocol.
          </p>
          <p className="mb-3">
            THIS INTERFACE AND THE RAYDIUM PROTOCOL ARE PROVIDED "AS IS", AT YOUR OWN RISK, AND WITHOUT WARRANTIES OF
            ANY KIND. The Raydium Holding Foundation does not provide, own, or control the Raydium Protocol or any
            transactions conducted on the protocol or via related smart contracts. By using or accessing this Interface
            or the Raydium Protocol and related smart contracts, you agree that no developer or entity involved in
            creating, deploying or maintaining this Interface or the Raydium Protocol will be liable for any claims or
            damages whatsoever associated with your use, inability to use, or your interaction with other users of, this
            Interface or the Raydium Protocol, including any direct, indirect, incidental, special, exemplary, punitive
            or consequential damages, or loss of profits, digital assets, tokens, or anything else of value.
          </p>
          <p className="mb-3">
            The Raydium Protocol is not available to residents of Belarus, the Central African Republic, The Democratic
            Republic of Congo, the Democratic People's Republic of Korea, the Crimea, Donetsk People's Republic, and
            Luhansk People's Republic regions of Ukraine, Cuba, Iran, Libya, Somalia, Sudan, South Sudan, Syria, the
            USA, Yemen, Zimbabwe and any other jurisdiction in which accessing or using the Raydium Protocol is
            prohibited (the "Prohibited Jurisdictions").
          </p>
          <p className="mb-3">
            By using or accessing this Interface, the Raydium Protocol, or related smart contracts, you represent that
            you are not located in, incorporated or established in, or a citizen or resident of the Prohibited
            Jurisdictions. You also represent that you are not subject to sanctions or otherwise designated on any list
            of prohibited or restricted parties or excluded or denied persons, including but not limited to the lists
            maintained by the United States' Department of Treasury's Office of Foreign Assets Control, the United
            Nations Security Council, the European Union or its Member States, or any other government authority.
          </p>
        </div>

        <Col className="">
          <Checkbox
            checkBoxSize="sm"
            className="mt-2 mb-6"
            checked={userHaveClickedAgree}
            onChange={setUserHaveClickedAgree}
            label={<div className="text-sm  text-white">I have read, understand and accept these terms.</div>}
          />

          <Button
            disabled={!userHaveClickedAgree}
            className={`text-[#ABC4FF]  frosted-glass-teal`}
            onClick={confirmDisclaimer}
          >
            Agree and Continue
          </Button>
        </Col>
      </Card>
    </ResponsiveDialogDrawer>
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

function Navbar({
  barTitle,
  className,
  style,
  onOpenMenu
}: {
  className?: string
  barTitle?:
    | string
    | {
        items: DropdownTitleInfoItem[]
        currentValue?: string
        onChange?: (value: string) => void
        urlSearchQueryKey?: string
        drawerTitle?: string
      }
  style?: CSSProperties
  // TODO: move it into useAppSetting()
  onOpenMenu?: () => void
}) {
  const isMobile = useAppSettings((s) => s.isMobile)
  const inDev = useAppSettings((s) => s.inDev) // show dev logo

  const pcNavContent = (
    <Row className="justify-between items-center mobile:h-14 mobile:bg-cyberpunk-card-bg">
      <Link href="/">
        <Image
          className={`cursor-pointer ${inDev ? 'hue-rotate-60' : ''} mobile:hidden`}
          src="/logo/logo-with-text.svg"
        />
      </Link>

      <Row className="gap-6 items-center mobile:hidden">
        <MessageBoardWidget />
        <TxVersionWidget />
        <WalletWidget />
      </Row>
    </Row>
  )
  const mobileNavContent = (
    <Grid className="grid-cols-[1fr,2fr,1fr] gap-2 mobile:px-5 mobile:py-3   items-center bg-cyberpunk-card-bg cyberpunk-bg-light">
      <div className="frosted-glass-teal rounded-lg p-2 clickable justify-self-start" onClick={onOpenMenu}>
        <Icon className="w-4 h-4" iconClassName="w-4 h-4" iconSrc="/icons/msic-menu.svg" />
      </div>

      {barTitle ? (
        isString(barTitle) ? (
          <div onClick={onOpenMenu} className="text-lg font-semibold place-self-center text-white -mb-1">
            {barTitle}
          </div>
        ) : (
          <MobileDropdownTitle
            titles={barTitle.items}
            currentValue={barTitle.currentValue}
            onChange={(value) => {
              barTitle.onChange?.(value)
            }}
            urlSearchQueryKey={barTitle.urlSearchQueryKey}
            drawerTitle={barTitle.drawerTitle}
          />
        )
      ) : (
        <Link className="place-self-center" href="/">
          <Image className="cursor-pointer" src="/logo/logo-only-icon.svg" />
        </Link>
      )}

      <Row className="gap-3 items-center justify-self-end">
        <TxVersionWidget />
        <WalletWidget />
      </Row>
    </Grid>
  )
  return (
    <nav className={twMerge('select-none text-white px-12 py-4 mobile:p-0 transition-all', className)} style={style}>
      {isMobile ? mobileNavContent : pcNavContent}
    </nav>
  )
}

type DropdownTitleInfoItem = {
  value: string
  barLabel?: string
  itemLabel?: string
}

function MobileDropdownTitle({
  titles,
  currentValue: defaultCurrentValue = titles[0].value,
  urlSearchQueryKey,
  onChange,
  drawerTitle
}: {
  titles: DropdownTitleInfoItem[]
  currentValue?: string
  urlSearchQueryKey?: string
  onChange?: (titleValue: string) => void
  drawerTitle?: string
}) {
  const [currentValue, setCurrentValue] = useState(defaultCurrentValue)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const currentTitleInfoItem = titles.find(({ value }) => value === currentValue)!
  useUrlQuery({
    currentValue: currentValue,
    values: titles.map((i) => i.value),
    onChange: onChange,
    queryKey: urlSearchQueryKey
  })

  return (
    <>
      <Row
        onClick={() => setIsDropdownOpen(true)}
        className="self-stretch gap-4 items-center justify-between font-medium px-3 bg-[#141041] rounded-lg"
      >
        {/* title */}
        <div className="text-white whitespace-nowrap">{currentTitleInfoItem.barLabel}</div>

        {/* icon */}
        <Icon heroIconName="chevron-down" size="xs" className="text-[#abc4ff80]" />
      </Row>

      <Drawer placement="from-bottom" open={isDropdownOpen} onClose={() => setIsDropdownOpen(false)}>
        {({ close }) => (
          <Card
            className="flex flex-col max-h-[60vh] mobile:max-h-full mobile:rounded-tl-3xl mobile:rounded-tr-3xl  mobile:w-full border-1.5 border-[rgba(171,196,255,0.2)] overflow-hidden bg-cyberpunk-card-bg "
            size="lg"
          >
            <Row className="justify-between items-center  py-2 pt-6 px-8">
              <div className="text-xs text-[#abc4ff] pl-2">{drawerTitle}</div>
              <Icon className="text-[#ABC4FF] cursor-pointer" size="smi" heroIconName="x" onClick={close} />
            </Row>

            <Col className="pb-2 px-4 divide-y divide-[rgba(171,196,255,0.2)]">
              {titles.map(({ value, itemLabel = value }) => {
                return (
                  <div
                    key={value}
                    className={`py-4 px-6 font-normal ${
                      value === currentValue ? 'text-white' : 'text-[rgba(171,196,255,0.5)] '
                    }`}
                    onClick={() => {
                      onChange?.(value)
                      setCurrentValue(value)
                      close()
                    }}
                  >
                    {itemLabel}
                  </div>
                )
              })}
            </Col>
          </Card>
        )}
      </Drawer>
    </>
  )
}

function SideMenu({ className, onClickCloseBtn }: { className?: string; onClickCloseBtn?(): void }) {
  const { pathname } = useRouter()
  const isMobile = useAppSettings((s) => s.isMobile)
  const isInLocalhost = useAppSettings((s) => s.isInLocalhost)
  const sideMenuRef = useRef<HTMLDivElement>(null)
  const latestVersion = useAppVersion((s) => s.latest)
  const currentVersion = useAppVersion((s) => s.currentVersion)
  const inDev = useAppSettings((s) => s.inDev) // show dev logo

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
          `h-full overflow-y-auto w-56 mobile:w-64 mobile:rounded-tr-2xl mobile:rounded-br-2xl`,
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
              <Image src="/logo/logo-with-text.svg" className={`mobile:scale-75 ${inDev ? 'hue-rotate-60' : ''}`} />
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
            <LinkItem icon="/icons/entry-icon-swap.svg" href="/swap" isCurrentRoutePath={pathname === '/swap'}>
              Swap
            </LinkItem>
            <LinkItem
              icon="/icons/entry-icon-liquidity.svg"
              href="/liquidity/add"
              isCurrentRoutePath={pathname === '/liquidity/add'}
            >
              Liquidity
            </LinkItem>
            <LinkItem
              icon="/icons/entry-icon-concentrated-pools.svg"
              href="/clmm/pools"
              isCurrentRoutePath={pathname === '/clmm/pools'}
            >
              Concentrated
            </LinkItem>
            <LinkItem icon="/icons/entry-icon-pools.svg" href="/pools" isCurrentRoutePath={pathname === '/pools'}>
              Pools
            </LinkItem>
            <LinkItem icon="/icons/entry-icon-farms.svg" href="/farms" isCurrentRoutePath={pathname === '/farms'}>
              Farms
            </LinkItem>
            <LinkItem icon="/icons/entry-icon-staking.svg" href="/staking" isCurrentRoutePath={pathname === '/staking'}>
              Staking
            </LinkItem>
            <LinkItem icon="/icons/entry-icon-acceleraytor.svg" href="/acceleraytor/list">
              AcceleRaytor
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
            <div className="text-sm mobile:text-xs m-2 mb-0 leading-relaxed opacity-50 hover:opacity-100 transition font-medium text-[#abc4ff] whitespace-nowrap cursor-default">
              <div>V {currentVersion.slice(1)}</div>
              <div>
                <BlockTimeClock />
              </div>
            </div>
            <Tooltip.Panel>
              <div className="text-xs m-2 leading-relaxed font-medium text-[#abc4ff] whitespace-nowrap cursor-default">
                <div>Current: {currentVersion}</div>
                <div>Latest: {latestVersion}</div>
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
          } text-sm mobile:text-[0.85rem] font-medium`}
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
      className="block py-3 mobile:py-2 px-8 pl-6 mobile:px-5 hover:bg-[rgba(57,208,216,0.1)] active:bg-[rgba(41,157,163,0.3)] cursor-pointer group"
    >
      <Row className="items-center w-full mobile:justify-center" onClick={onClick}>
        <Icon
          className="mr-3 text-[rgba(57,208,216,1)]"
          size={isMobile ? 'xs' : 'sm'}
          iconSrc={iconSrc}
          heroIconName={heroIconName}
        />
        <span
          className={`text-[#ACE3E5] text-sm mobile:text-[0.85rem] font-medium flex-grow ${
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
      <div>
        <SetTolerance />
      </div>
      <div className="mt-4">
        <SetExplorer />
      </div>
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
                  (loadingCustomizedEndPoint?.name ?? extractRPCName(loadingCustomizedEndPoint?.url ?? '')) || ''
                })`
              : `RPC (${(currentEndPoint?.name ?? extractRPCName(currentEndPoint.url)) || ''})`
            : '--'}
        </span>
        <Icon size={isMobile ? 'xs' : 'sm'} heroIconName="chevron-right" iconClassName="text-[#ACE3E6]" />
      </Row>
    </div>
  )
}
function RpcConnectionPanelPopover({ close: closePanel }: { close: () => void }) {
  const availableEndPoints = useConnection((s) => s.availableEndPoints)
  const availableDevEndPoints = useConnection((s) => s.availableDevEndPoints)
  const currentEndPoint = useConnection((s) => s.currentEndPoint)
  const autoChoosedEndPoint = useConnection((s) => s.autoChoosedEndPoint)
  const userCostomizedUrlText = useConnection((s) => s.userCostomizedUrlText)
  const switchConnectionFailed = useConnection((s) => s.switchConnectionFailed)
  const switchRpc = useConnection((s) => s.switchRpc)
  const deleteRpc = useConnection((s) => s.deleteRpc)
  const isLoading = useConnection((s) => s.isLoading)
  return (
    <>
      <div className="pt-3 -mb-1 mobile:mb-2 px-6 mobile:px-3 text-[rgba(171,196,255,0.5)] text-xs mobile:text-sm">
        RPC CONNECTION
      </div>
      <div className="gap-3 divide-y-1.5">
        {availableEndPoints.concat(availableDevEndPoints ?? []).map((endPoint) => {
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
              useConnection.setState({ userCostomizedUrlText: searchText.trim() })
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
