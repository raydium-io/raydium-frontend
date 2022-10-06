import { SplToken } from '@/application/token/type'
import RectTabs, { TabItem } from '@/components/RectTabs'
import { useCallback, useMemo } from 'react'

interface Props {
  coin1?: SplToken
  coin2?: SplToken
  fee?: string
  focusSide: 'coin1' | 'coin2'
  onChangeFocus: (focusSide: 'coin1' | 'coin2') => void
}

const tabClasses = 'mobile:justify-center mobile:w-1/2'

export default function SwitchFocusTabs(props: Props) {
  const { coin1, coin2, focusSide, onChangeFocus } = props
  const isFocus1 = focusSide === 'coin1'

  const tabs = useMemo(() => {
    const tabs: TabItem[] = []
    coin1 &&
      tabs.push({
        name: `${coin1.symbol || 'Unknown'} price`,
        value: coin1.id,
        className: tabClasses
      })
    coin2 &&
      tabs.push({
        name: `${coin2.symbol || 'Unknown'} price`,
        value: coin2.id,
        className: tabClasses
      })
    return tabs
  }, [coin1, coin2])

  const handleChangeFocus = useCallback(
    (tab: TabItem) => {
      onChangeFocus(tab.value === coin2!.id ? 'coin2' : 'coin1')
    },
    [coin2]
  )

  return (
    <div className="flex justify-between items-center mobile:flex-col mobile:items-baseline mobile:mb-3">
      {coin1 && coin2 && (
        <RectTabs
          classNames="ml-4 mobile:w-full mobile:ml-0"
          tabs={tabs}
          selected={isFocus1 ? coin1.id : coin2?.id}
          onChange={handleChangeFocus}
        />
      )}
    </div>
  )
}
