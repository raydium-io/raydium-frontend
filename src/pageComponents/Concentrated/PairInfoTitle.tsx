import Decimal from 'decimal.js'
import { SplToken } from '@/application/token/type'
import RectTabs, { TabItem } from '@/components/RectTabs'
import { useCallback, useMemo } from 'react'
import CoinAvatarPair from '@/components/CoinAvatarPair'

interface Props {
  coin1?: SplToken
  coin2?: SplToken
  fee?: string
  focusSide: 'coin1' | 'coin2'
  onChangeFocus: (focusSide: 'coin1' | 'coin2') => void
}

const tabClasses = 'mobile:justify-center mobile:w-1/2'

export function PairInfoTitle(props: Props) {
  const { coin1, coin2, fee, focusSide, onChangeFocus } = props
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
    <div className="flex justify-between items-center mb-[27px] mobile:flex-col mobile:items-baseline mobile:mb-3">
      <div className="flex items-center mobile:mb-2">
        <CoinAvatarPair size="lg" token1={coin1} token2={coin2} />
        <span className="ml-2 text-xl font-medium mobile:text-lg text-white">
          {coin1?.symbol || '-'} / {coin2?.symbol || '-'}
        </span>
        <div className="px-2.5 py-1 ml-2 rounded-lg text-sm text-secondary-title bg-active-tab-bg">
          Pool Fee {fee || '-'}
        </div>
      </div>
      <div className="flex items-center mobile:w-full">
        {coin1 && coin2 && (
          <RectTabs
            classNames="ml-4 mobile:w-full mobile:ml-0"
            tabs={tabs}
            selected={isFocus1 ? coin1.id : coin2?.id}
            onChange={handleChangeFocus}
          />
        )}
      </div>
    </div>
  )
}
