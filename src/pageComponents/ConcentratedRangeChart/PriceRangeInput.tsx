import InputBox from '@/components/InputBox'
import { Range } from './chartUtil'

interface Props {
  decimals: number
  minValue?: number | string
  maxValue?: number | string
  onPriceChange: (props: { val: number | string | undefined; side: Range }) => void
  onInDecrease: (props: { val?: number | string; side: Range; isIncrease: boolean }) => string
}

export default function PriceRangeInput({ decimals, minValue, maxValue, onPriceChange, onInDecrease }: Props) {
  return (
    <div className="flex gap-2.5">
      <InputBox
        className="grow border border-light-blue-opacity"
        label="Min Price"
        decimalMode
        showPlusMinusControls
        decimalCount={decimals}
        value={minValue}
        increaseFn={() => onInDecrease({ val: minValue, side: Range.Min, isIncrease: true })}
        decreaseFn={() => onInDecrease({ val: minValue, side: Range.Min, isIncrease: false })}
        onUserInput={(val, { triggerBy }) => {
          // if (triggerBy === 'increase-decrease') return // no need to record again
          if (!val || triggerBy === 'increase-decrease') return
          onPriceChange({ val, side: Range.Min })
        }}
      />
      <InputBox
        className="grow border border-light-blue-opacity"
        label="Max Price"
        decimalMode
        showPlusMinusControls
        decimalCount={decimals}
        value={maxValue}
        increaseFn={() => onInDecrease({ val: maxValue, side: Range.Max, isIncrease: true })}
        decreaseFn={() => onInDecrease({ val: maxValue, side: Range.Max, isIncrease: false })}
        onUserInput={(val, { triggerBy }) => {
          if (!val || triggerBy === 'increase-decrease') return
          onPriceChange({ val, side: Range.Max })
        }}
      />
    </div>
  )
}
