import useAppSettings from '@/application/common/useAppSettings'
import Icon from '@/components/Icon'
import Input from '@/components/Input'
import Row from '@/components/Row'
import Tooltip from '@/components/Tooltip'
import { eq } from '@/functions/numberish/compare'
import { div, mul } from '@/functions/numberish/operations'
import { toString } from '@/functions/numberish/toString'

export default function SetTolerance() {
  const slippageTolerance = useAppSettings((s) => s.slippageTolerance)
  const slippageToleranceState = useAppSettings((s) => s.slippageToleranceState)

  return (
    <>
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
            eq(slippageTolerance, 0.003) ? 'ring-1 ring-inset ring-[#39D0D8]' : ''
          } cursor-pointer`}
          onClick={() => {
            useAppSettings.setState({ slippageTolerance: '0.003' })
          }}
        >
          0.3%
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
            !(eq(slippageTolerance, 0.001) || eq(slippageTolerance, 0.003) || eq(slippageTolerance, 0.005))
              ? 'ring-1 ring-inset ring-[#39D0D8]'
              : ''
          }`}
        >
          <Row>
            <Input
              className="w-[32px]"
              placeholder="0"
              value={toString(mul(slippageTolerance, 100), { decimalLength: 'auto 2' })}
              onUserInput={(value) => {
                const n = div(parseFloat(value || '0'), 100)
                useAppSettings.setState({ slippageTolerance: n })
              }}
              pattern={/^\d*\.?\d*$/}
              maximum={100}
            />
            <div>%</div>
          </Row>
        </div>
      </Row>
      <Row>
        {slippageToleranceState === 'invalid' && (
          <div className={`flex-1 w-0 mt-2 mobile:mt-6 text-[#DA2EEF] text-xs mobile:text-sm`}>
            Please enter a valid slippage percentage
          </div>
        )}
        {slippageToleranceState === 'too small' && (
          <div className={`flex-1 w-0 mt-2 mobile:mt-6 text-[#D8CB39] text-xs mobile:text-sm`}>
            Your transaction may fail
          </div>
        )}
        {slippageToleranceState === 'too large' && (
          <div className={`flex-1 w-0 mt-2 mobile:mt-6 text-[#D8CB39] text-xs mobile:text-sm`}>
            Your transaction may be frontrun and result in an unfavourable trade
          </div>
        )}
      </Row>
    </>
  )
}
