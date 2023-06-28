import useNotification from '@/application/notification/useNotification'
import { MayArray } from '@/types/generics'
import { SDKParsedConcentratedInfo, UserPositionAccount } from '../concentrated/type'
import { getConcentratedPositionFee } from './getConcentratedPositionFee'
import { AsyncAwait } from '@/components/AsyncAwait'
import Col from '@/components/Col'
import { isMeaningfulNumber } from '@/functions/numberish/compare'
import { toString } from '@/functions/numberish/toString'

type HasConfirmState = Promise<boolean>

/**
 * not just data, also ui
 */
export function openToken2022ClmmHavestConfirmPanel(payload: {
  currentAmmPool: MayArray<SDKParsedConcentratedInfo | undefined>
  currentPosition?: MayArray<UserPositionAccount | undefined>
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
  useNotification.getState().popConfirm({
    cardWidth: 'lg',
    type: 'warning',
    title: 'Confirm Token 2022',
    description: ({ updateConfig }) => (
      <div className="space-y-2 text-left">
        <p className="text-center">balabalabala. Confirm this token before transaction.</p>

        <AsyncAwait promise={infos} fallback="loading...">
          {(infos) => (
            <Col className="space-y-2">
              {Object.entries(infos).map(([poolId, value]) => (
                <div key={poolId} className="flex items-center justify-between">
                  <div className="text-sm">pool: {poolId.slice(0, 4)}</div>
                  <div className="text-sm">
                    {Object.entries(value).map(([positionNftMint, positionFeeInfos]) => (
                      <div key={positionNftMint}>
                        <div>position: {positionNftMint.slice(0, 4)}</div>
                        <div>
                          {positionFeeInfos.map(({ type, feeInfo }, idx) => (
                            <AsyncAwait key={type + idx} promise={feeInfo}>
                              {(feeInfo) =>
                                isMeaningfulNumber(feeInfo?.fee) ? (
                                  <Col>
                                    <div>{type}</div>
                                    <div>{toString(feeInfo!.fee)}</div>
                                  </Col>
                                ) : undefined
                              }
                            </AsyncAwait>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </Col>
          )}
        </AsyncAwait>
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
