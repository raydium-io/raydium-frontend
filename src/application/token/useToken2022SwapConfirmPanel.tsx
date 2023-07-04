import { useEffect, useMemo, useState } from 'react'

import useNotification from '@/application/notification/useNotification'
import { isToken2022 } from '@/application/token/isToken2022'
import { SplToken } from '@/application/token/type'
import { AddressItem } from '@/components/AddressItem'
import CoinAvatar from '@/components/CoinAvatar'
import Col from '@/components/Col'
import Row from '@/components/Row'
import { shakeUndifindedItem } from '@/functions/arrayMethods'
import { capitalize } from '@/functions/changeCase'
import toPubString from '@/functions/format/toMintString'
import { toString } from '@/functions/numberish/toString'
import { MayArray } from '@/types/generics'

import { AsyncAwait } from '../../components/AsyncAwait'

import { getOnlineTokenInfo } from './getOnlineTokenInfo'

/**
 * not just data, also ui
 */
export function useToken2022SwapConfirmPanel(payload: {
  token: MayArray<SplToken | undefined>
  onCancel?(): void
  onConfirm?(): void
}): {
  hasConfirmed: boolean
  popConfirm(): void
} {
  const targetTokens = [payload.token].flat()
  const targetTokenMints = useMemo(
    () => targetTokens.filter(Boolean)?.map((coin) => toPubString(coin!.mint)),
    [toPubString(targetTokens?.[0]?.mint)]
  )
  const targetToken2022s = useMemo(
    () => shakeUndifindedItem(targetTokens.map((coin) => (isToken2022(coin) ? coin : undefined))),
    [targetTokenMints]
  )
  const hasToken2022 = targetToken2022s.length > 0
  const [hasUserTemporaryConfirmed, setHasUserTemporaryConfirmed] = useState(false)
  const [isPanelOn, setPanelOn] = useState(false)

  useEffect(() => {
    setHasUserTemporaryConfirmed(false)
  }, [targetTokenMints])

  const popNotOfficialTokenConfirm = () => {
    if (isPanelOn) return
    setPanelOn(true)
    const infos = Object.fromEntries(
      targetToken2022s.map((targetCoin) => [toPubString(targetCoin.mint), getOnlineTokenInfo(targetCoin.mint)])
    )
    useNotification.getState().popConfirm({
      cardWidth: 'lg',
      type: 'warning',
      title: 'Confirm Token 2022',
      description: ({ updateConfig }) => (
        <div className="space-y-2 text-left">
          <p className="text-center">balabalabala. Confirm this is the token that you want to trade.</p>

          {targetToken2022s.map((targetCoin) => (
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
              <AsyncAwait
                promise={infos[toPubString(targetCoin.mint)]}
                onFullfilled={() => updateConfig({ disableConfirmButton: false })}
                fallback="loading..."
              >
                {(tokenMintInfo) => (
                  <Col className="table">
                    <Row className="table-row">
                      <div className="table-cell px-2 font-medium">Decimals:</div>
                      <div className="table-cell px-2">{tokenMintInfo.decimals}</div>
                    </Row>
                    <Row className="table-row">
                      <div className="table-cell px-2 font-medium">Frozen:</div>
                      <div className="table-cell px-2">
                        {capitalize(String(Boolean(tokenMintInfo.freezeAuthority)))}
                      </div>
                    </Row>
                    <Row className="table-row">
                      <div className="table-cell px-2 font-medium">Transfer Fee BPS:</div>
                      <div className="table-cell px-2">{tokenMintInfo.transferFeeBasisPoints}</div>
                    </Row>
                    <Row className="table-row">
                      <div className="table-cell px-2 font-medium">Transfer Fee Max:</div>
                      <div className="table-cell px-2">
                        {toString(tokenMintInfo.maximumFee, { decimalLength: `auto ${tokenMintInfo.decimals}` })}
                      </div>
                    </Row>
                  </Col>
                )}
              </AsyncAwait>
            </Row>
          ))}
        </div>
      ),
      confirmButtonIsMainButton: true,
      disableConfirmButton: true,
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

  const hasConfirmed = !hasToken2022 || hasUserTemporaryConfirmed

  useEffect(() => {
    if (!hasConfirmed && targetTokenMints.length > 0) popNotOfficialTokenConfirm()
  }, [targetTokenMints, hasConfirmed])

  return { hasConfirmed, popConfirm: popNotOfficialTokenConfirm }
}
