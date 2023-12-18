import useAppSettings from '@/application/common/useAppSettings'
import Grid from '@/components/Grid'
import Icon from '@/components/Icon'
import Input from '@/components/Input'
import Row from '@/components/Row'
import Tooltip from '@/components/Tooltip'
import { eq } from '@/functions/numberish/compare'

export default function SetTransactionPriority() {
  const transactionPriority = useAppSettings((s) => s.transactionPriority)

  return (
    <>
      <Row className="items-center mb-3 mobile:mb-6 gap-2">
        <div className="text-[rgba(171,196,255,0.5)] text-xs mobile:text-sm">TRANSACTION PRIORITY</div>
        <Tooltip placement="bottom-right">
          <Icon size="sm" heroIconName="question-mark-circle" className="cursor-help text-[rgba(171,196,255,0.5)]" />
          <Tooltip.Panel className="max-w-[300px]">
            <div>
              The priority fee is paid to the Solana network. This additional fee helps boost how a transaction is
              prioritized against others, resulting in faster transaction execution times.
            </div>
          </Tooltip.Panel>
        </Tooltip>
      </Row>
      <Grid className="gap-3 justify-between grid-cols-3 mobile:grid-cols-2">
        <Row
          className={`py-1 px-3 bg-[#141041] rounded-full text-[#F1F1F2] font-medium text-sm ${
            transactionPriority === undefined ? 'ring-1 ring-inset ring-[#39D0D8]' : ''
          } cursor-pointer items-center gap-2 justify-between`}
          onClick={() => {
            useAppSettings.setState({ transactionPriority: undefined })
          }}
        >
          <div className="text-xs text-[#abc4ff80]">Auto</div>
          <div>Dynamic</div>
        </Row>
        <Row
          className={`py-1 px-3 bg-[#141041] rounded-full text-[#F1F1F2] font-medium text-sm ${
            transactionPriority === 0 ? 'ring-1 ring-inset ring-[#39D0D8]' : ''
          } cursor-pointer items-center gap-2 justify-between`}
          onClick={() => {
            useAppSettings.setState({ transactionPriority: 0 })
          }}
        >
          <div className="text-xs text-[#abc4ff80]">Normal</div>
          <div className="whitespace-nowrap">0 SOL</div>
        </Row>
        <Row
          className={`py-1 px-3 bg-[#141041] rounded-full text-[#F1F1F2] font-medium text-sm ${
            eq(transactionPriority, 0.00005) ? 'ring-1 ring-inset ring-[#39D0D8]' : ''
          } cursor-pointer items-center gap-2 justify-between`}
          onClick={() => {
            useAppSettings.setState({ transactionPriority: 0.00005 })
          }}
        >
          <div className="text-xs text-[#abc4ff80]">High</div>
          <div className="whitespace-nowrap">0.00005 SOL</div>
        </Row>
        <Row
          className={`py-1 px-3 bg-[#141041] rounded-full text-[#F1F1F2] font-medium text-sm ${
            eq(transactionPriority, 0.005) ? 'ring-1 ring-inset ring-[#39D0D8]' : ''
          } cursor-pointer items-center gap-2 justify-between`}
          onClick={() => {
            useAppSettings.setState({ transactionPriority: 0.005 })
          }}
        >
          <div className="text-xs text-[#abc4ff80]">Turbo</div>
          <div className="whitespace-nowrap">0.005 SOL</div>
        </Row>
        <div
          className={`py-1 px-3 bg-[#141041] rounded-full text-[#F1F1F2] font-medium text-sm ${
            transactionPriority &&
            !(eq(transactionPriority, 0) || eq(transactionPriority, 0.00005) || eq(transactionPriority, 0.005))
              ? 'ring-1 ring-inset ring-[#39D0D8]'
              : ''
          } items-center gap-2 col-span-2`}
        >
          <Row className="items-center gap-2">
            <div className="text-xs text-[#abc4ff80]">Custom</div>
            <Input
              className="flex-1 w-[4em]"
              inputClassName="text-right"
              value={transactionPriority != null ? String(transactionPriority) : ''}
              onUserInput={(value) => {
                const n = Number(value) || undefined
                useAppSettings.setState({ transactionPriority: n })
              }}
              pattern={/^\d*\.?\d*$/}
              maximum={0.01}
            />
            <div>SOL</div>
          </Row>
        </div>
      </Grid>
    </>
  )
}
