import useNotification from '@/application/notification/useNotification'
import { MayArray } from '@/types/generics'
import { SDKParsedConcentratedInfo } from '../concentrated/type'
import { getConcentratedPositionFee } from './getConcentratedPositionFee'

type HasConfirmState = Promise<boolean>

/**
 * not just data, also ui
 */
export function openToken2022ClmmHavestConfirmPanel(payload: {
  currentAmmPool: MayArray<SDKParsedConcentratedInfo | undefined>
  onCancel?(): void
  onConfirm?(): void
}): {
  hasConfirmed: HasConfirmState
} {
  let resolve: (value: boolean | PromiseLike<boolean>) => void
  let reject: (reason?: any) => void
  const hasConfirmed = new Promise<boolean>((res, rej) => {
    resolve = res
    reject = rej
  })
  const infos = getConcentratedPositionFee({ currentAmmPool: payload.currentAmmPool })
  // infos.then((infos) => console.log('infos: ', infos))
  useNotification.getState().popConfirm({
    cardWidth: 'lg',
    type: 'warning',
    title: 'Confirm Token 2022',
    description: ({ updateConfig }) => (
      <div className="space-y-2 text-left">
        <p className="text-center">balabalabala. Confirm this token before transaction.</p>

        {/* {targetToken2022s.map((targetCoin) => (
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
                    <div className="table-cell px-2">{capitalize(String(Boolean(tokenMintInfo.freezeAuthority)))}</div>
                  </Row>
                  <Row className="table-row">
                    <div className="table-cell px-2 font-medium">Transfer Fee BPS:</div>
                    <div className="table-cell px-2">{tokenMintInfo.transferFeeBasisPoints}</div>
                  </Row>
                  <Row className="table-row">
                    <div className="table-cell px-2 font-medium">Transfer Fee Max:</div>
                    <div className="table-cell px-2">{toString(tokenMintInfo.maximumFee)}</div>
                  </Row>
                </Col>
              )}
            </AsyncAwait>
          </Row>
        ))} */}
      </div>
    ),
    confirmButtonIsMainButton: true,
    disableConfirmButton: true,
    cancelButtonText: 'Cancel',
    confirmButtonText: 'Confirm',
    onConfirm: () => {
      resolve(true)
      payload.onConfirm?.()
    },
    onCancel: () => {
      resolve(false)
      payload.onCancel?.()
    }
  })

  return { hasConfirmed }
}
