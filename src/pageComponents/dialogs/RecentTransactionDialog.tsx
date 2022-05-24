import React from 'react'

import useAppSettings from '@/application/appSettings/useAppSettings'
import useTxHistory, { TxHistoryInfo } from '@/application/txHistory/useTxHistory'
import Button from '@/components/Button'
import Card from '@/components/Card'
import Dialog from '@/components/Dialog'
import Icon, { AppHeroIconName } from '@/components/Icon'
import Row from '@/components/Row'
import { toUTC } from '@/functions/date/dateFormat'

import Drawer from '../../components/Drawer'
import Link from '../../components/Link'
import useWallet from '@/application/wallet/useWallet'
import toPubString from '@/functions/format/toMintString'

const iconSettings: Record<
  'success' | 'fail' | 'droped' | 'pending',
  { heroIconName: AppHeroIconName; textColor: string } | { iconSrc: string }
> = {
  success: {
    heroIconName: 'check-circle',
    textColor: 'text-[#39d0d8]'
  },
  fail: {
    heroIconName: 'exclamation-circle',
    textColor: 'text-[#DA2EEF]'
  },
  droped: {
    heroIconName: 'exclamation-circle',
    textColor: 'text-[#DA2EEF]'
  },
  pending: {
    iconSrc: '/icons/loading-dual.svg'
  }
}

export default function RecentTransactionDialog() {
  const isRecentTransactionDialogShown = useAppSettings((s) => s.isRecentTransactionDialogShown)
  const { txHistory } = useTxHistory()
  const isMobile = useAppSettings((s) => s.isMobile)

  return isMobile ? (
    <Drawer
      placement="from-top"
      open={isRecentTransactionDialogShown}
      onClose={() => useAppSettings.setState({ isRecentTransactionDialogShown: false })}
    >
      {({ close }) => <PanelContent onClickX={close} historyItems={txHistory} />}
    </Drawer>
  ) : (
    <Dialog
      open={isRecentTransactionDialogShown}
      onClose={() => useAppSettings.setState({ isRecentTransactionDialogShown: false })}
    >
      {({ close }) => <PanelContent onClickX={close} historyItems={txHistory} />}
    </Dialog>
  )
}

function PanelContent({ historyItems, onClickX }: { historyItems: TxHistoryInfo[]; onClickX(): void }) {
  const owner = useWallet((s) => s.owner)
  return (
    <Card
      className="flex flex-col max-h-[60vh] mobile:max-h-screen rounded-3xl mobile:rounded-none w-[min(750px,100vw)] mobile:w-full border-1.5 border-[rgba(171,196,255,0.2)] overflow-hidden bg-cyberpunk-card-bg shadow-cyberpunk-card"
      size="lg"
    >
      <Row className="justify-between items-center p-8">
        <div className="text-xl font-semibold text-white">Recent transactions</div>
        <Icon className="text-[#ABC4FF] cursor-pointer" heroIconName="x" onClick={onClickX} />
      </Row>

      <Row
        type="grid-x"
        className="gap-[3.5vw] grid-cols-[1fr,1fr,1fr] pb-3 px-8  border-b-1.5 border-[rgba(171,196,255,0.2)]"
      >
        {/* table head column: Transaction type */}
        <div className="font-medium text-[rgba(171,196,255,0.5)] text-xs">Transaction type</div>
        {/* table head column: Details */}
        <div className="font-medium text-[rgba(171,196,255,0.5)] text-xs">Details</div>
        {/* table head column: Date and time */}
        <div className="font-medium text-[rgba(171,196,255,0.5)] text-xs">Date and time</div>
      </Row>

      <div className="overflow-y-auto flex-1 mx-3" /* let scrollbar have some space */>
        {historyItems.length > 0 ? (
          historyItems.map((txInfo) => (
            <Link noTextStyle key={txInfo.txid} href={`https://solscan.io/tx/${txInfo.txid}`}>
              <Row
                type="grid-x"
                className="gap-[3.5vw] grid-cols-[1fr,1fr,1fr] py-4 px-3 clickable clickable-filter-effect items-center"
              >
                {/* table head column: Transaction type */}
                <Row className="font-medium text-[#ABC4FF] text-xs gap-2">
                  <Icon
                    size="sm"
                    heroIconName={(iconSettings[txInfo.status] as any).heroIconName}
                    iconSrc={(iconSettings[txInfo.status] as any).iconSrc}
                    className={(iconSettings[txInfo.status] as any).textColor}
                  />
                  <div>{txInfo.title ?? ''}</div>
                </Row>
                {/* table head column: Details */}
                <div className="font-medium text-[#ABC4FF] text-xs">{txInfo.description}</div>
                {/* table head column: Date and time */}
                <div className="font-medium text-[#ABC4FF] text-xs">{toUTC(txInfo.time)}</div>
              </Row>
            </Link>
          ))
        ) : (
          <div className="font-medium text-[rgba(171,196,255,0.3)] text-sm py-4 text-center">
            No recent transactions on Raydium
          </div>
        )}
      </div>

      <Row className="border-t-1.5 border-[rgba(171,196,255,0.2)]">
        <Link
          className="py-4 rounded-none flex-grow font-medium text-[#ABC4FF] text-xs flex justify-center gap-1 items-center"
          href={owner ? `https://solscan.io/account/${toPubString(owner)}` : ''}
        >
          View all transactions
          <Icon size="xs" inline heroIconName="external-link" />
        </Link>
      </Row>
    </Card>
  )
}
