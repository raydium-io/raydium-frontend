import { twMerge } from 'tailwind-merge'
import useConcentrated, { TimeBasis } from '@/application/concentrated/useConcentrated'
import RectTabs from '@/components/RectTabs'

export function ConcentratedTimeBasisSwitcher({ className }: { className?: string }) {
  const timeBasis = useConcentrated((s) => s.timeBasis)
  return (
    <RectTabs
      classNames={twMerge('bg-[#181753] ml-4 mobile:w-full mobile:ml-0', className)}
      tabs={[
        { label: '24H', value: '24H' },
        { label: '7D', value: '7D' },
        { label: '30D', value: '30D' }
      ]}
      selectedValue={timeBasis}
      tabClassName={(isSelected) => (isSelected ? 'bg-[#141041]' : 'bg-transparent')}
      onChange={(tab) => useConcentrated.setState({ timeBasis: tab.value as TimeBasis })}
    />
  )
}
