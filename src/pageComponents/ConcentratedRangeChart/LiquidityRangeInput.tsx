import RangeInput from '@/components/RangeInput'

export default function LiquidityRangeInput() {
  return (
    <RangeInput
      currentAmount="99.99%"
      max={999}
      className="py-3 px-3 ring-1 mobile:ring-1 ring-[rgba(54, 185, 226, 0.5)] rounded-xl mobile:rounded-xl "
    />
  )
}
