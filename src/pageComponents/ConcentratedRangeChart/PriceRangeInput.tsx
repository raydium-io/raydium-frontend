import InputBox from '@/components/InputBox'
import { Range } from './chartUtil'

interface Props {
  decimals: number
  minValue?: number | string
  maxValue?: number | string
  onPriceChange: (props: { val: number | string | undefined; side: Range }) => void
  onInDecrease: (props: { val?: number | string; side: Range; isIncrease: boolean }) => void
}

export default function PriceRangeInput({ decimals, minValue, maxValue, onPriceChange, onInDecrease }: Props) {
  return (
    <div className="flex gap-2.5">
      <InputBox
        className="grow border-1.5 border-[#abc4ff40]"
        label="Min Price"
        decimalMode
        showPlusMinusControls
        decimalCount={decimals}
        value={minValue}
        maxN={maxValue ? Number(maxValue) : undefined}
        increaseFn={() => {
          onInDecrease({ val: minValue, side: Range.Min, isIncrease: true })
          return undefined
        }}
        decreaseFn={() => {
          onInDecrease({ val: minValue, side: Range.Min, isIncrease: false })
          return undefined
        }}
        onUserInput={(val, { triggerBy }) => {
          const isClick = triggerBy === 'increase-decrease'
          if (!val || isClick) return
          onPriceChange({ val, side: Range.Min })
        }}
      />
      <InputBox
        className="grow border-1.5 border-[#abc4ff40]"
        label="Max Price"
        decimalMode
        showPlusMinusControls
        decimalCount={decimals}
        value={maxValue}
        minN={minValue ? Number(minValue) : undefined}
        increaseFn={() => {
          onInDecrease({ val: maxValue, side: Range.Max, isIncrease: true })
          return undefined
        }}
        decreaseFn={() => {
          onInDecrease({ val: maxValue, side: Range.Max, isIncrease: false })
          return undefined
        }}
        onUserInput={(val, { triggerBy }) => {
          if (!val || triggerBy === 'increase-decrease') return
          onPriceChange({ val, side: Range.Max })
        }}
      />
    </div>
  )
}
