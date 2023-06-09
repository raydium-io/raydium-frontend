import { useEffect, useMemo, useState } from 'react'
import useNotification from '@/application/notification/useNotification'
import { SplToken } from '@/application/token/type'
import { AddressItem } from '@/components/AddressItem'
import CoinAvatar from '@/components/CoinAvatar'
import Row from '@/components/Row'
import toPubString from '@/functions/format/toMintString'
import { isToken2022 } from '@/application/token/isToken2022'

/**
 * not just data, also ui
 */
export function useToken2022ConfirmPanel(payload: {
  coin: SplToken | undefined
  onCancel?(): void
  onConfirm?(): void
}): {
  hasConfirmed: boolean
  popConfirm: () => void
} {
  const targetCoin = payload.coin
  const isTargetCoinToken2022 = useMemo(() => targetCoin && isToken2022(targetCoin), [toPubString(targetCoin?.mint)])

  const [hasUserTemporaryConfirmed, setHasUserTemporaryConfirmed] = useState(false)
  const [isPanelOn, setPanelOn] = useState(false)

  useEffect(() => {
    setHasUserTemporaryConfirmed(false)
  }, [toPubString(targetCoin?.mint)])

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

          <Row className="justify-center items-center gap-2 my-4 bg-[#141041] rounded py-3 w-full">
            <CoinAvatar token={targetCoin} />
            <div className="font-semibold">{targetCoin?.symbol}</div>
            <AddressItem textClassName="text-[#abc4ff80]" showDigitCount={8} canExternalLink>
              {targetCoin?.mint}
            </AddressItem>
          </Row>
          {/* {freezed && (
                      <div>
                        <div className="text-center my-4 text-[#FED33A] font-bold">Freeze Authority Warning</div>
                        <div className="text-center my-2  text-xs text-[#FED33A]">
                          This token has freeze authority enabled and could
                          <br />
                          prevent you from transferring or trading the token later.
                        </div>
                      </div>
                    )} */}
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

  const hasConfirmed = !isTargetCoinToken2022 || hasUserTemporaryConfirmed

  useEffect(() => {
    if (!hasConfirmed && targetCoin) popNotOfficialTokenConfirm()
  }, [targetCoin, hasConfirmed])

  return { hasConfirmed, popConfirm: popNotOfficialTokenConfirm }
}
