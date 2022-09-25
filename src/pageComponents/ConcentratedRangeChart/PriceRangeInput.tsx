import InputBox from '@/components/InputBox'

interface Props {
  decimals: number
  minValue?: number | string
  maxValue?: number | string
}

export default function PriceRangeInput({ decimals, minValue, maxValue }: Props) {
  return (
    <div className="flex gap-2.5">
      <InputBox
        className="grow border border-light-blue-opacity"
        label="Min Price"
        decimalMode
        showPlusMinusControls
        decimalCount={decimals}
        value={minValue}
        // increaseFn={() => getNextPrevPrice('min', 'increase')}
        // decreaseFn={() => getNextPrevPrice('min', 'decrease')}
        onUserInput={(v, { triggerBy }) => {
          if (triggerBy === 'increase-decrease') return // no need to record again
          if (v == null) return
        }}
      />
      <InputBox
        className="grow border border-light-blue-opacity"
        label="Max Price"
        decimalMode
        showPlusMinusControls
        decimalCount={decimals}
        value={maxValue}
        // increaseFn={() => getNextPrevPrice('max', 'increase')}
        // decreaseFn={() => getNextPrevPrice('max', 'decrease')}
        onUserInput={(v, { triggerBy }) => {
          if (triggerBy === 'increase-decrease') return // no need to record again
          if (v == null) return
        }}
      />
    </div>
  )
}
