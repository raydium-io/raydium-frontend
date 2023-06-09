import useNotification from '@/application/notification/useNotification'
import { isToken2022 } from '@/application/token/isToken2022'
import { SplToken } from '@/application/token/type'
import { AddressItem } from '@/components/AddressItem'
import CoinAvatar from '@/components/CoinAvatar'
import Row from '@/components/Row'
import { shakeUndifindedItem } from '@/functions/arrayMethods'
import toPubString from '@/functions/format/toMintString'
import { MayArray } from '@/types/generics'
import { useEffect, useMemo, useState } from 'react'
import { AsyncAwait } from '../../components/AsyncAwait'
import { getOnlineTokenInfo } from './getOnlineTokenInfo'

/**
 * not just data, also ui
 */
export function useToken2022ConfirmPanel(payload: {
  coin: MayArray<SplToken | undefined>
  onCancel?(): void
  onConfirm?(): void
}): {
  hasConfirmed: boolean
  popConfirm(): void
} {
  const targetCoins = [payload.coin].flat()
  const targetCoinsMints = useMemo(
    () => targetCoins.filter(Boolean)?.map((coin) => toPubString(coin!.mint)),
    [toPubString(targetCoins?.[0]?.mint)]
  )
  const targetCoinToken2022s = useMemo(
    () => shakeUndifindedItem(targetCoins?.filter((coin) => coin && isToken2022(coin))),
    [targetCoinsMints]
  )
  const hasCoinToken2022 = targetCoinToken2022s.length > 0
  const [hasUserTemporaryConfirmed, setHasUserTemporaryConfirmed] = useState(false)
  const [isPanelOn, setPanelOn] = useState(false)

  useEffect(() => {
    setHasUserTemporaryConfirmed(false)
  }, [targetCoinsMints])

  const popNotOfficialTokenConfirm = () => {
    if (isPanelOn) return
    setPanelOn(true)
    useNotification.getState().popConfirm({
      cardWidth: 'lg',
      type: 'warning',
      title: 'Confirm Token 2022',
      description: (
        <div className="space-y-2 text-left">
          <p className="text-center">balabalabala. Confirm this is the token that you want to trade.</p>

          {targetCoinToken2022s.map((targetCoin) => {
            return (
              <Row
                key={toPubString(targetCoin?.mint)}
                className="flex-col items-center gap-2 my-4 bg-[#141041] rounded py-3 w-full"
              >
                <Row className="items-center gap-2">
                  <CoinAvatar token={targetCoin} />
                  <div className="font-semibold">{targetCoin?.symbol}</div>
                  <AddressItem textClassName="text-[#abc4ff80]" showDigitCount={8} canExternalLink>
                    {targetCoin?.mint}
                  </AddressItem>
                </Row>
                <AsyncAwait promise={getOnlineTokenInfo(targetCoin?.mint)} fallback="loading...">
                  {(solved) => <div>decimals: {solved?.decimals}</div>}
                </AsyncAwait>
              </Row>
            )
          })}
        </div>
      ),
      confirmButtonIsMainButton: true,
      cancelButtonText: 'Cancel',
      confirmButtonText: 'Confirm',
      onConfirm: () => {
        setHasUserTemporaryConfirmed(true)
        setPanelOn(false)
        payload.onConfirm?.()
      },
      onCancel: () => {
        setHasUserTemporaryConfirmed(false)
        setPanelOn(false)
        payload.onCancel?.()
      }
    })
  }

  const hasConfirmed = !hasCoinToken2022 || hasUserTemporaryConfirmed

  useEffect(() => {
    if (!hasConfirmed && targetCoinsMints.length > 0) popNotOfficialTokenConfirm()
  }, [targetCoinsMints, hasConfirmed])

  return { hasConfirmed, popConfirm: popNotOfficialTokenConfirm }
}
