import Decimal from 'decimal.js'
import { SplToken } from '@/application/token/type'
import CoinAvatar from '@/components/CoinAvatar'
import RectTabs, { TabItem } from '@/components/RectTabs'
import { useCallback, useMemo } from 'react'

interface Props {
  coin1?: SplToken
  coin2?: SplToken
  fee?: string
  currentPrice?: Decimal
  focusSide: 'coin1' | 'coin2'
  onChangeFocus: (focusSide: 'coin1' | 'coin2') => void
}

export function PairInfoTitle(props: Props) {
  const { coin1, coin2, currentPrice, fee, focusSide, onChangeFocus } = props
  const isFocus1 = focusSide === 'coin1'

  const tabs = useMemo(() => {
    const tabs: TabItem[] = []
    coin1 && tabs.push({ name: `${coin1.symbol || 'Unknown'} price`, value: coin1.id })
    coin2 && tabs.push({ name: `${coin2.symbol || 'Unknown'} price`, value: coin2.id })
    return tabs
  }, [coin1, coin2])

  const handleChangeFocus = useCallback(
    (tab: TabItem) => {
      onChangeFocus(tab.value === coin2!.id ? 'coin2' : 'coin1')
    },
    [coin2]
  )

  const getPrice = () => {
    if (!currentPrice || !coin1 || !coin2) return ''
    if (isFocus1) return currentPrice.toDecimalPlaces(coin1?.decimals).toString()
    return new Decimal(1).div(currentPrice).toDecimalPlaces(coin2?.decimals).toString()
  }

  const [coin1Symbol = '--', coin2Symbol = '--'] = isFocus1
    ? [coin1?.symbol, coin2?.symbol]
    : [coin2?.symbol, coin1?.symbol]

  return (
    <div className="flex justify-between items-center mb-[27px]">
      <div className="flex items-center">
        <CoinAvatar className="z-10 inline-block" noCoinIconBorder size="md" token={coin1} />
        <CoinAvatar className="-ml-3 inline-block" noCoinIconBorder size="md" token={coin2} />
        <span className="ml-2 text-xl">
          {coin1Symbol} / {coin2Symbol}
        </span>
        <div className="px-1 ml-2 text-sm text-secondary-title rounded-xl border border-secondary-title">
          {fee || '-'}
        </div>
      </div>
      <div className="flex items-center">
        {currentPrice && (
          <>
            {getPrice()} {coin1Symbol} per {coin2Symbol}
          </>
        )}
        {coin1 && coin2 && (
          <RectTabs
            classNames="ml-4"
            tabs={tabs}
            selected={isFocus1 ? coin1.id : coin2?.id}
            onChange={handleChangeFocus}
          />
        )}
      </div>
    </div>
  )
}
