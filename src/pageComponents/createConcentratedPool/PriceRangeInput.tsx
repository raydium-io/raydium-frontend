import InputBox from '@/components/InputBox'
import { Range } from './type'

interface Props {
  decimals: number
  minValue?: number | string
  maxValue?: number | string
  onBlur?: (props: { side: Range; val?: number | string }) => void
  onPriceChange: (props: { val: number | string | undefined; side: Range }) => void
  onInDecrease: (props: { val?: number | string; side: Range; isIncrease: boolean }) => void
}

export default function PriceRangeInput({ decimals, minValue, maxValue, onPriceChange, onInDecrease, onBlur }: Props) {
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
        onBlur={() => onBlur?.({ side: Range.Low, val: minValue })}
        increaseFn={() => {
          onInDecrease({ val: minValue, side: Range.Low, isIncrease: true })
          return undefined
        }}
        decreaseFn={() => {
          onInDecrease({ val: minValue, side: Range.Low, isIncrease: false })
          return undefined
        }}
        onUserInput={(val, { triggerBy }) => {
          const isClick = triggerBy === 'increase-decrease'
          if (!val || isClick) return
          onPriceChange({ val, side: Range.Low })
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
        onBlur={() => onBlur?.({ side: Range.Upper, val: maxValue })}
        increaseFn={() => {
          onInDecrease({ val: maxValue, side: Range.Upper, isIncrease: true })
          return undefined
        }}
        decreaseFn={() => {
          onInDecrease({ val: maxValue, side: Range.Upper, isIncrease: false })
          return undefined
        }}
        onUserInput={(val, { triggerBy }) => {
          if (!val || triggerBy === 'increase-decrease') return
          onPriceChange({ val, side: Range.Upper })
        }}
      />
    </div>
  )
}
