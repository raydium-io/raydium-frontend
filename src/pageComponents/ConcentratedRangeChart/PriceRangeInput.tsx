import InputBox from '@/components/InputBox'
import parseNumberInfo from '@/functions/numberish/parseNumberInfo'
import { Range } from './chartUtil'

interface Props {
  decimals: number
  minValue?: number | string
  maxValue?: number | string
  onBlur?: (side: Range) => void
  onPriceChange: (props: { val: number | string | undefined; side: Range }) => void
  onInDecrease: (props: { val?: number | string; side: Range; isIncrease: boolean }) => number
}

export const minAcceptPriceDecimal = 15

export const maxSignificantCount = (decimals: number) => Math.min(decimals + 2, minAcceptPriceDecimal)

export default function PriceRangeInput({ decimals, minValue, maxValue, onPriceChange, onInDecrease, onBlur }: Props) {
  const minValueDecimalsIsBiggerThan10 = (parseNumberInfo(minValue).dec?.length ?? 0) > 10
  const maxValueDecimalsIsBiggerThan10 = (parseNumberInfo(maxValue).dec?.length ?? 0) > 10

  return (
    <div className="flex gap-2.5">
      <InputBox
        className={`grow p-2 border-1.5 border-[#abc4ff40] ${minValueDecimalsIsBiggerThan10 ? 'text-sm' : 'text-base'}`}
        label="Min Price"
        decimalMode
        showPlusMinusControls
        decimalCount={minAcceptPriceDecimal}
        valueToStringOptions={{
          maxSignificantCount: maxSignificantCount(decimals)
        }}
        value={minValue}
        maxN={maxValue ? Number(maxValue) : undefined}
        onBlur={() => onBlur?.(Range.Min)}
        increaseFn={() => onInDecrease({ val: minValue, side: Range.Min, isIncrease: true })}
        decreaseFn={() => onInDecrease({ val: minValue, side: Range.Min, isIncrease: false })}
        onUserInput={(val, { triggerBy }) => {
          // console.log('val: ', val) //TODO: let Cruz to play number magic <-- val may be 15 decimals. which depends on user's input
          const isClick = triggerBy === 'increase-decrease'
          if (!val || isClick) return
          onPriceChange({ val, side: Range.Min })
        }}
      />
      <InputBox
        className={`grow p-2 border-1.5 border-[#abc4ff40] ${maxValueDecimalsIsBiggerThan10 ? 'text-sm' : 'text-base'}`}
        label="Max Price"
        decimalMode
        showPlusMinusControls
        decimalCount={minAcceptPriceDecimal}
        valueToStringOptions={{
          maxSignificantCount: maxSignificantCount(decimals)
        }}
        value={maxValue}
        minN={minValue ? Number(minValue) : undefined}
        onBlur={() => onBlur?.(Range.Max)}
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
