import { useRef, useState } from 'react'

import { WalletAdapter, WalletReadyState } from '@solana/wallet-adapter-base'

import useAppSettings from '@/application/common/useAppSettings'
import useNotification from '@/application/notification/useNotification'
import useWallet from '@/application/wallet/useWallet'
import { Badge } from '@/components/Badge'
import Button from '@/components/Button'
import Card from '@/components/Card'
import Col from '@/components/Col'
import FadeInStable from '@/components/FadeIn'
import Grid from '@/components/Grid'
import Icon from '@/components/Icon'
import Input from '@/components/Input'
import Link from '@/components/Link'
import ResponsiveDialogDrawer from '@/components/ResponsiveDialogDrawer'
import Row from '@/components/Row'
import { extensionMap } from '@/functions/dom/getExtension'
import { getPlatformInfo } from '@/functions/dom/getPlatformInfo'

function WalletSelectorPanelItem({
  wallet,
  detected,
  onClick,
  showBadge
}: {
  wallet: { adapter: WalletAdapter; readyState: WalletReadyState }
  detected?: boolean
  onClick?(): void
  showBadge: boolean
}) {
  const isMobile = useAppSettings((s) => s.isMobile)
  const { select, adapter } = useWallet()
  const { logInfo } = useNotification()

  return (
    <Row
      className={`relative items-center gap-3 m-auto px-6 mobile:px-3 mobile:py-1.5 py-3 w-64 mobile:w-[42vw] h-14  mobile:h-12 frosted-glass frosted-glass-teal rounded-xl mobile:rounded-lg ${
        detected ? 'opacity-100' : 'opacity-60'
      } clickable clickable-filter-effect`}
      // TODO disable status
      onClick={() => {
        // eslint-disable-next-line no-console
        console.log(
          'wallet.adapter.name',
          wallet.adapter.name,
          'extensionMap[wallet.adapter.name]',
          extensionMap[wallet.adapter.name],
          Object.keys(extensionMap),
          wallet.readyState
        )
        if (wallet.readyState !== WalletReadyState.Installed && !extensionMap[wallet.adapter.name]?.autoHandle) {
          logInfo(
            'Wallet installation required ',
            <div>
              <p>
                Please install {wallet.adapter.name}{' '}
                {wallet.adapter.url ? (
                  <span>
                    from the official&nbsp;
                    <a
                      href={wallet.adapter.url}
                      rel="noreferrer"
                      style={{ color: 'white', textDecoration: 'underline' }}
                      target="_blank"
                    >
                      website
                    </a>
                  </span>
                ) : (
                  ''
                )}
                <br />
                {extensionMap[wallet.adapter.name]?.[getPlatformInfo()?.browserName ?? ''] ? (
                  <>
                    or use the{' '}
                    {getPlatformInfo()?.isAndroid || getPlatformInfo()?.isIOS ? (
                      <a
                        href={extensionMap[wallet.adapter.name]?.[getPlatformInfo()?.browserName ?? '']}
                        rel="noreferrer"
                        style={{ color: 'white', textDecoration: 'underline' }}
                        target="_blank"
                      >
                        App
                      </a>
                    ) : (
                      <a
                        href={extensionMap[wallet.adapter.name]?.[getPlatformInfo()?.browserName ?? '']}
                        rel="noreferrer"
                        style={{ color: 'white', textDecoration: 'underline' }}
                        target="_blank"
                      >
                        extension
                      </a>
                    )}
                  </>
                ) : (
                  ''
                )}
              </p>
            </div>
          )
        } else {
          select(wallet.adapter.name)
          onClick?.()
        }
      }}
    >
      <Icon className="shrink-0" size={isMobile ? 'md' : 'lg'} iconSrc={wallet.adapter.icon} />
      <Row className="grow items-center justify-between flex-wrap">
        <div className="mobile:text-sm text-base font-bold text-white">{wallet.adapter.name}</div>
        {detected && !isMobile && (
          <Badge
            className={` mobile:text-2xs  text-white ${
              showBadge ? 'opacity-80' : 'hidden'
            } mix-blend-soft-light transition`}
          >
            detected
          </Badge>
        )}
      </Row>
    </Row>
  )
}

function SimulateWallet({ onClick }: { onClick?(): void }) {
  const isMobile = useAppSettings((s) => s.isMobile)
  const { select } = useWallet()
  const valueRef = useRef('')
  return (
    <Col className="p-6 mobile:py-3 mobile:px-4 flex-grow ring-inset ring-1.5 mobile:ring-1 ring-[rgba(171,196,255,.5)] rounded-3xl mobile:rounded-xl items-center gap-3 m-8 mt-2 mb-4">
      <div className="mobile:text-sm text-base font-bold text-white">Simulate Wallet Address</div>
      <Input
        className="w-full"
        onUserInput={(value) => (valueRef.current = value)}
        onEnter={(value) => {
          if (value) {
            // @ts-expect-error force
            select(value)
            onClick?.()
          }
        }}
      />
      <Button
        className="frosted-glass-teal"
        onClick={() => {
          if (valueRef.current) {
            // @ts-expect-error force
            select(valueRef.current)
            onClick?.()
          }
        }}
      >
        Fake it 🤘
      </Button>
    </Col>
  )
}

export default function WalletSelectorDialog() {
  const isWalletSelectorShown = useAppSettings((s) => s.isWalletSelectorShown)
  const { availableWallets } = useWallet()
  return (
    <ResponsiveDialogDrawer
      placement="from-top"
      open={isWalletSelectorShown}
      onCloseImmediately={() => useAppSettings.setState({ isWalletSelectorShown: false })}
    >
      {({ close }) => <PanelContent close={close} wallets={availableWallets} />}
    </ResponsiveDialogDrawer>
  )
}

function PanelContent({
  close,
  wallets
}: {
  close(): void
  wallets: { adapter: WalletAdapter; readyState: WalletReadyState }[]
}) {
  const supportedWallets = wallets.filter((w) => w.readyState !== WalletReadyState.Unsupported)
  const installedWallets = supportedWallets.filter(
    (w) => w.readyState !== WalletReadyState.NotDetected && w.adapter.name !== 'Sollet'
  )
  const notInstalledWallets = supportedWallets.filter((w) => w.readyState == WalletReadyState.NotDetected)
  const solletWallet = supportedWallets.find((w) => w.adapter.name === 'Sollet')
  solletWallet && notInstalledWallets.push(solletWallet)

  const [isAllWalletShown, setIsAllWalletShown] = useState(false)
  const isInLocalhost = useAppSettings((s) => s.isInLocalhost)
  const isInBonsaiTest = useAppSettings((s) => s.isInBonsaiTest)
  return (
    <Card
      className="flex flex-col max-h-screen  w-[586px] mobile:w-screen rounded-3xl mobile:rounded-none border-1.5 border-[rgba(171,196,255,0.2)] overflow-hidden bg-cyberpunk-card-bg shadow-cyberpunk-card"
      size="lg"
    >
      <Row className="items-center justify-between p-8 mobile:p-4">
        <div className="text-xl mobile:text-lg font-semibold text-white">Connect your wallet to Raydium</div>
        <Icon className="text-[#ABC4FF] cursor-pointer" heroIconName="x" onClick={close} />
      </Row>

      {/* Disclaimer */}
      <div className="grow text-sm mobile:text-xs leading-normal text-[#abc4ffb3] rounded p-4 mobile:p-2 mobile:px-4 mb-6 mobile:mb-4 mx-8 mobile:mx-6 bg-[#141041]">
        By connecting your wallet, you acknowledge that you have read, understand and accept the terms in the
        <Link href="/docs/disclaimer" className="text-[#abc4ff] px-1.5" onClick={close}>
          Disclaimer
        </Link>
      </div>

      <Grid
        className={`px-8 mobile:px-6 gap-x-6 gap-y-3 mobile:gap-2 ${
          installedWallets.length === 1 ? 'grid-cols-1' : 'grid-cols-2'
        } grow`}
      >
        {installedWallets.map((wallet) => (
          <WalletSelectorPanelItem
            key={wallet.adapter.name}
            wallet={wallet}
            onClick={close}
            detected
            showBadge={isAllWalletShown}
          />
        ))}
      </Grid>

      <div className={`flex-1 ${isAllWalletShown ? 'mt-4' : ''} h-32 overflow-auto no-native-scrollbar`}>
        <FadeInStable show={isAllWalletShown}>
          <div className="pt-8 h-full">
            <div className="text-[#abc4ff80] text-sm mobile:text-xs px-8 py-1">OTHER WALLETS</div>
            <Grid
              className="flex-1 px-8 justify-items-stretch mobile:px-6 pb-4 overflow-auto no-native-scrollbar  gap-x-6 gap-y-3 mobile:gap-2 grid-cols-2 mobile:grid-cols-[1fr,1fr]"
              style={{ scrollbarGutter: 'always' }}
            >
              {notInstalledWallets.map((wallet) => (
                <WalletSelectorPanelItem
                  key={wallet.adapter.name}
                  wallet={wallet}
                  onClick={close}
                  detected={false}
                  showBadge={isAllWalletShown}
                />
              ))}
            </Grid>
            {(isInLocalhost || isInBonsaiTest) && <SimulateWallet onClick={close} />}
          </div>
        </FadeInStable>
      </div>

      <Row
        className="m-4 text-[#abc4ff] justify-center items-center clickable"
        onClick={() => setIsAllWalletShown((b) => !b)}
      >
        <div className="font-bold mobile:text-sm">Show uninstalled wallets</div>
        <Icon className="mx-2" size="sm" heroIconName={isAllWalletShown ? 'chevron-up' : 'chevron-down'}></Icon>
      </Row>

      <div className="py-4 text-white text-center font-medium text-sm border-t-1.5 border-[rgba(171,196,255,0.2)]">
        New here?{' '}
        <Link href="https://raydium.gitbook.io/raydium/" className="text-[#abc4ff]">
          Get started on Raydium!
        </Link>
      </div>
    </Card>
  )
}
