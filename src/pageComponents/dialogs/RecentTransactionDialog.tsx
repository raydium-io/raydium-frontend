import useAppSettings from '@/application/common/useAppSettings'
import useTxHistory, { TxHistoryInfo } from '@/application/txHistory/useTxHistory'
import useWallet from '@/application/wallet/useWallet'
import Card from '@/components/Card'
import Col from '@/components/Col'
import Collapse from '@/components/Collapse'
import Dialog from '@/components/Dialog'
import Drawer from '@/components/Drawer'
import Icon, { AppHeroIconName } from '@/components/Icon'
import LinkExplorer from '@/components/LinkExplorer'
import Row from '@/components/Row'
import { shakeUndifindedItem } from '@/functions/arrayMethods'
import { toUTC } from '@/functions/date/dateFormat'
import toPubString from '@/functions/format/toMintString'
import { isArray } from '@/functions/judgers/dateType'
import { useMemo } from 'react'

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
      {({ close }) => <PanelContent onClose={close} historyItems={txHistory} />}
    </Drawer>
  ) : (
    <Dialog
      open={isRecentTransactionDialogShown}
      onClose={() => useAppSettings.setState({ isRecentTransactionDialogShown: false })}
    >
      {({ close }) => <PanelContent onClose={close} historyItems={txHistory} />}
    </Dialog>
  )
}

function SingleRecentTransactionItem({ txInfo }: { txInfo: TxHistoryInfo }) {
  const isMobile = useAppSettings((s) => s.isMobile)
  return (
    <LinkExplorer hrefDetail={`tx/${txInfo.txid}`} noTextStyle>
      <Row
        type="grid-x"
        className="group gap-[min(3.5vw,24px)] grid-cols-[1.2fr,2fr,1.2fr] rounded-lg py-4 px-4 hover:bg-[#14104180] items-center"
      >
        {/* table head column: Transaction type */}
        <Row className="group-hover:underline underline-offset-1 items-center font-medium text-[#ABC4FF] text-xs gap-2">
          <Icon
            size={isMobile ? 'sm' : 'smi'}
            heroIconName={(iconSettings[txInfo.status] as any)?.heroIconName}
            iconSrc={(iconSettings[txInfo.status] as any).iconSrc}
            className={(iconSettings[txInfo.status] as any).textColor}
          />
          <Col className="w-full">
            <div>{txInfo.title ?? ''}</div>
            {txInfo.wallet && (
              <div className="text-[#abc4ff80]">
                (wallet:{txInfo.wallet.slice(0, 4)}...{txInfo.wallet.slice(-4)})
              </div>
            )}
          </Col>
        </Row>
        {/* table head column: Details */}
        <div className="font-medium text-[#ABC4FF] text-xs">{txInfo.description}</div>
        {/* table head column: Date and time */}
        <div className="font-medium text-[#ABC4FF] text-xs">{toUTC(txInfo.time)}</div>
      </Row>
    </LinkExplorer>
  )
}

function MultiTransactionGroupItems({ txInfoGroup }: { txInfoGroup: TxHistoryInfo[] }) {
  const wholeItemState = txInfoGroup.every(({ status }) => status === 'success')
    ? 'success'
    : txInfoGroup.some(({ status }) => status === 'fail')
    ? 'fail'
    : 'info'
  const headTx = { ...txInfoGroup[0], status: wholeItemState }
  const isMobile = useAppSettings((s) => s.isMobile)
  return (
    <div className="rounded-lg hover:bg-[#14104180] ">
      <Collapse>
        <Collapse.Face>
          {({ isOpen }) => (
            <Row
              type="grid-x"
              className="group gap-[min(3.5vw,24px)] grid-cols-[1.2fr,2fr,1.2fr] py-4 px-4 items-center"
            >
              {/* table head column: Transaction type */}
              <Row className="items-center font-medium text-[#ABC4FF] text-xs gap-2">
                <Icon
                  size={isMobile ? 'sm' : 'smi'}
                  heroIconName={(iconSettings[headTx.status] as any)?.heroIconName}
                  iconSrc={(iconSettings[headTx.status] as any).iconSrc}
                  className={(iconSettings[headTx.status] as any).textColor}
                />
                <Col className="w-full">
                  <div>{headTx.title ?? ''}</div>
                  {headTx.wallet && (
                    <div className="text-[#abc4ff80]">
                      (wallet:{headTx.wallet.slice(0, 4)}...{headTx.wallet.slice(-4)})
                    </div>
                  )}
                </Col>
                <div className="flex-none ml-0.5 grid place-items-center h-4 w-4 rounded-full bg-[#abc4ff40] text-[#abc4ff]">
                  <Icon size="xs" heroIconName={isOpen ? 'chevron-up' : 'chevron-down'} />
                </div>
              </Row>
              {/* table head column: Details */}
              <div className="font-medium text-[#ABC4FF] text-xs">{headTx.description}</div>
              {/* table head column: Date and time */}
              <div className="font-medium text-[#ABC4FF] text-xs">{toUTC(headTx.time)}</div>
            </Row>
          )}
        </Collapse.Face>
        <Collapse.Body>
          <div className="pb-2">
            {txInfoGroup.map((txInfo, idx) => (
              <LinkExplorer hrefDetail={`tx/${txInfo.txid}`} noTextStyle key={txInfo.txid}>
                <Row
                  type="grid-x"
                  className="group gap-[min(3.5vw,24px)] grid-cols-[1.2fr,2fr,1.2fr] rounded-lg py-2 px-4  items-center"
                >
                  {/* table head column: Transaction type */}
                  <Row></Row>
                  {/* table head column: Details */}
                  <Row className="group-hover:underline underline-offset-1 gap-2 items-center font-medium text-[#ABC4FF80] text-xs">
                    <Icon
                      size="sm"
                      heroIconName={(iconSettings[txInfo.status] as any)?.heroIconName}
                      iconSrc={(iconSettings[txInfo.status] as any).iconSrc}
                      className={(iconSettings[txInfo.status] as any).textColor}
                    />
                    <Col>
                      <div>{txInfo.subtransactionDescription ?? `Transaction ${idx + 1}`}</div>
                    </Col>
                  </Row>
                  {/* table head column: Date and time */}
                  <div className="font-medium text-[#ABC4FF80] text-xs">{toUTC(txInfo.time)}</div>
                </Row>
              </LinkExplorer>
            ))}
          </div>
        </Collapse.Body>
      </Collapse>
    </div>
  )
}

// new icon of history item
function RecentTransactionItems({ txHistoryInfos }: { txHistoryInfos: TxHistoryInfo[] }) {
  // make it: `{'txid': TxHistoryInfo, 'txidB': [TxHistoryInfo, TxHistoryInfo, TxHistoryInfo]}` structure
  const groupedTransactionInfos = useMemo(() => {
    const resultGroup = {} as Record<string, TxHistoryInfo | TxHistoryInfo[]>
    for (const infoItem of txHistoryInfos) {
      const relativeHeadTx = infoItem.relativeTxids?.[0] ?? infoItem.txid
      resultGroup[relativeHeadTx] = infoItem.isMulti
        ? shakeUndifindedItem([resultGroup[relativeHeadTx]].flat()).concat(infoItem)
        : infoItem
    }
    return resultGroup
  }, [txHistoryInfos])

  return (
    <>
      {Object.entries(groupedTransactionInfos).map(([key, info]) =>
        isArray(info) ? (
          <MultiTransactionGroupItems key={key} txInfoGroup={info} />
        ) : (
          <SingleRecentTransactionItem key={key} txInfo={info} />
        )
      )}
    </>
  )
}

function PanelContent({ historyItems, onClose }: { historyItems: TxHistoryInfo[]; onClose(): void }) {
  const owner = useWallet((s) => s.owner)
  return (
    <Card
      className="flex flex-col max-h-[60vh] mobile:max-h-screen rounded-3xl mobile:rounded-none w-[min(750px,100vw)] mobile:w-full border-1.5 border-[rgba(171,196,255,0.2)] overflow-hidden bg-cyberpunk-card-bg shadow-cyberpunk-card"
      size="lg"
    >
      <Row className="justify-between items-center p-8">
        <div className="text-xl font-semibold text-white">Recent transactions</div>
        <Icon className="text-[#ABC4FF] cursor-pointer" heroIconName="x" onClick={onClose} />
      </Row>

      <Row
        type="grid-x"
        className="gap-[min(3.5vw,24px)] grid-cols-[1.2fr,2fr,1.2fr] pb-3 px-8 border-b-1.5 border-[rgba(171,196,255,0.2)]"
      >
        {/* table head column: Transaction type */}
        <div className="font-medium text-[rgba(171,196,255,0.5)] text-xs">Transaction type</div>
        {/* table head column: Details */}
        <div className="font-medium text-[rgba(171,196,255,0.5)] text-xs">Details</div>
        {/* table head column: Date and time */}
        <div className="font-medium text-[rgba(171,196,255,0.5)] text-xs">Date and time</div>
      </Row>

      <div className="overflow-y-auto flex-1 mx-4 my-2" /* let scrollbar have some space */>
        {historyItems.length > 0 ? (
          <RecentTransactionItems txHistoryInfos={historyItems}></RecentTransactionItems>
        ) : (
          <div className="font-medium text-[rgba(171,196,255,0.3)] text-sm py-4 text-center">
            No recent transactions on Raydium
          </div>
        )}
      </div>

      <Row className="border-t-1.5 border-[rgba(171,196,255,0.2)]">
        <LinkExplorer
          className="py-4 rounded-none flex-grow font-medium text-[#ABC4FF] text-xs flex justify-center gap-1 items-center"
          hrefDetail={owner ? `${toPubString(owner)}` : ''}
          type="account"
        >
          View all transactions
          <Icon size="xs" inline heroIconName="external-link" />
        </LinkExplorer>
      </Row>
    </Card>
  )
}
