import React, { ReactNode, useEffect } from 'react'

import useAppSettings from '@/application/appSettings/useAppSettings'
import useWallet from '@/application/wallet/useWallet'
import copyToClipboard from '@/functions/dom/copyToClipboard'
import useToggle from '@/hooks/useToggle'

import Button from '../Button'
import Icon from '../Icon'
import PageLayoutPopoverDrawer from '../PageLayoutPopoverDrawer'
import Row from '../Row'
import { FadeIn } from '../FadeIn'

export function ThreeSlotItem({
  text,
  suffix,
  prefix,
  onClick
}: {
  text: string
  suffix?: ReactNode
  prefix?: ReactNode
  onClick?(): void
}) {
  return (
    <Row
      className="gap-3 py-4 px-6 border-[rgba(171,196,255,0.2)] cursor-pointer clickable clickable-filter-effect items-center"
      onClick={onClick}
    >
      {prefix}
      <div className="text-white text-sm whitespace-nowrap">{text}</div>
      {suffix}
    </Row>
  )
}

/** this should be used in ./Navbar.tsx */
export default function WalletWidget() {
  const isMobile = useAppSettings((s) => s.isMobile)
  const [isCopied, { delayOff, on }] = useToggle()

  useEffect(() => {
    if (isCopied) delayOff()
  }, [isCopied])

  const { owner: publicKey, disconnect, connected } = useWallet()

  return (
    <PageLayoutPopoverDrawer
      canOpen={connected}
      alwaysPopper
      popupPlacement="bottom-right"
      renderPopoverContent={({ close: closePanel }) => (
        <>
          <div className="pt-3 -mb-1 mobile:mb-2 px-6 text-[rgba(171,196,255,0.5)] text-xs mobile:text-sm">
            CONNECTED WALLET
          </div>
          <div className="gap-3 divide-y-1.5">
            <FadeIn noOpenTransitation>
              {publicKey && (
                <ThreeSlotItem
                  text={isCopied ? 'copied' : `${String(publicKey).slice(0, 7)}...${String(publicKey).slice(-7)}`}
                  suffix={
                    !isCopied && <Icon size="sm" className="clickable text-[#ABC4FF]" heroIconName="clipboard-copy" />
                  }
                  onClick={() => {
                    if (!isCopied) copyToClipboard(String(publicKey)).then(on)
                  }}
                />
              )}
            </FadeIn>
            <ThreeSlotItem
              prefix={<Icon size="sm" iconSrc="/icons/misc-recent-transactions.svg" />}
              text="Recent Transactions"
              onClick={() => {
                useAppSettings.setState({ isRecentTransactionDialogShown: true })
                closePanel?.()
              }}
            />
            <ThreeSlotItem
              prefix={<Icon size="sm" iconSrc="/icons/misc-disconnect-wallet.svg" />}
              text="Disconnect wallet"
              onClick={() => {
                disconnect()
                closePanel?.()
              }}
            />
          </div>
        </>
      )}
    >
      {isMobile ? (
        <Button
          className="frosted-glass frosted-glass-teal rounded-lg p-2"
          onClick={() => {
            if (!publicKey) useAppSettings.setState({ isWalletSelectorShown: true })
          }}
        >
          <Icon
            className="w-4 h-4"
            iconClassName="w-4 h-4"
            iconSrc={connected ? '/icons/msic-wallet-connected.svg' : '/icons/msic-wallet.svg'}
          />
        </Button>
      ) : (
        <Button
          className="frosted-glass frosted-glass-teal"
          onClick={() => {
            if (!publicKey) useAppSettings.setState({ isWalletSelectorShown: true })
          }}
        >
          {connected ? (
            <Row className="items-center gap-3 my-0.5">
              <Icon size="sm" iconSrc="/icons/msic-wallet-connected.svg" />
              <div className="text-sm font-medium text-white">
                {String(publicKey).slice(0, 5)}...{String(publicKey).slice(-5)}
              </div>
            </Row>
          ) : (
            <Row className="items-center gap-3 my-0.5">
              <Icon size="sm" iconSrc="/icons/msic-wallet.svg" />
              <div className="text-sm font-medium text-[#39D0D8]">Connect Wallet</div>
            </Row>
          )}
        </Button>
      )}
    </PageLayoutPopoverDrawer>
  )
}
