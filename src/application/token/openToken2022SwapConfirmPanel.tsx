import { ReturnTypeGetAllRouteComputeAmountOut, Token, TokenAmount } from '@raydium-io/raydium-sdk'

import { twMerge } from 'tailwind-merge'

import useNotification from '@/application/notification/useNotification'
import { AddressItem } from '@/components/AddressItem'
import { AsyncAwait } from '@/components/AsyncAwait'
import CoinAvatar from '@/components/CoinAvatar'
import Col from '@/components/Col'
import Grid from '@/components/Grid'
import Icon from '@/components/Icon'
import LoadingCircle from '@/components/LoadingCircle'
import Row from '@/components/Row'
import Tooltip from '@/components/Tooltip'
import toPubString from '@/functions/format/toMintString'
import toPercentString from '@/functions/format/toPercentString'
import { toTokenAmount } from '@/functions/format/toTokenAmount'
import { gte, isMeaningfulNumber } from '@/functions/numberish/compare'
import { toString } from '@/functions/numberish/toString'

import { getOnlineTokenInfo, TokenMintInfo } from './getOnlineTokenInfo'
import { isToken2022 } from './isToken2022'
import { SplToken } from './type'
import useToken from './useToken'

type HasConfirmState = Promise<boolean>

/**
 * not just data, also ui
 */
export function openToken2022SwapConfirmPanel({
  // upCoin,
  // downCoin,
  routInfo,
  onCancel,
  onConfirm
}: {
  // upCoin?: Token
  // downCoin?: Token
  routInfo?: ReturnTypeGetAllRouteComputeAmountOut[number]
  onCancel?(): void
  onConfirm?(): void
}): {
  hasConfirmed: HasConfirmState
} {
  const { getToken } = useToken.getState()

  const upCoinMint = routInfo && 'token' in routInfo.amountIn.amount ? routInfo.amountIn.amount.token.mint : undefined
  const downCoinMint =
    routInfo && 'token' in routInfo.amountOut.amount ? routInfo.amountOut.amount.token.mint : undefined
  const middleRouteCoinMint = routInfo?.routeType === 'route' ? routInfo.middleToken.mint : undefined

  const upCoin = getToken(upCoinMint)
  const downCoin = getToken(downCoinMint)
  const middleRouteCoin = getToken(middleRouteCoinMint)

  // only token 2022
  const upCoinMintInfo = upCoinMint && isToken2022(upCoinMint) ? getOnlineTokenInfo(upCoinMint) : undefined
  // only token 2022
  const downCoinMintInfo = downCoinMint && isToken2022(downCoinMint) ? getOnlineTokenInfo(downCoinMint) : undefined
  // only token 2022
  const middleRouteCoinMintInfo =
    middleRouteCoinMint && isToken2022(middleRouteCoinMint) ? getOnlineTokenInfo(middleRouteCoinMint) : undefined

  let resolve: (value: boolean | PromiseLike<boolean>) => void
  let reject: (reason?: any) => void
  const hasConfirmed = new Promise<boolean>((res, rej) => {
    resolve = res
    reject = rej
  })

  const combinedPromise = Promise.all([upCoinMintInfo, middleRouteCoinMintInfo, downCoinMintInfo])

  useNotification.getState().popConfirm({
    cardWidth: 'lg',
    type: 'warning',
    title: 'Confirm Token2022',
    description: (
      <div>
        <p className="mb-2 text-center">🤖balabala,balabalabala</p>
      </div>
    ),
    additionalContent: ({ updateConfig }) => (
      <Col className="gap-2 w-full">
        <AsyncAwait
          promise={combinedPromise}
          fallback={<LoadingCircle className="mx-auto" />}
          onFullfilled={() => {
            updateConfig({
              disableConfirmButton: false
            })
          }}
        >
          {([upCoinMintInfo, middleRouteCoinMintInfo, downCoinMintInfo]) => (
            <Col className="space-y-4 max-h-[50vh] overflow-auto">
              {[
                {
                  mintInfo: upCoinMintInfo,
                  coin: upCoin,
                  transferFee: upCoin && toTokenAmount(upCoin, routInfo?.amountIn.fee, { alreadyDecimaled: true })
                },
                {
                  mintInfo: middleRouteCoinMintInfo,
                  coin: middleRouteCoin,
                  transferFee:
                    middleRouteCoin && routInfo?.routeType === 'route' ? routInfo?.minMiddleAmountFee : undefined
                },
                {
                  mintInfo: downCoinMintInfo,
                  coin: downCoin,
                  transferFee: downCoin && toTokenAmount(downCoin, routInfo?.amountOut.fee, { alreadyDecimaled: true })
                }
              ].map(({ mintInfo, coin, transferFee }, idx) =>
                mintInfo && transferFee ? (
                  <div key={`${mintInfo?.mint} ${idx}`} className="bg-[#abc4ff1a] rounded-xl">
                    {/* ammPool name */}
                    <InfoItemHeader coin={coin} />

                    {/* position info */}
                    <FeeInfoRow transferFee={transferFee} token={coin} mintInfo={mintInfo} />
                  </div>
                ) : undefined
              )}
            </Col>
          )}
        </AsyncAwait>
      </Col>
    ),
    confirmButtonIsMainButton: true,
    disableConfirmButton: true,
    cancelButtonText: 'Cancel',
    confirmButtonText: 'Confirm',
    onConfirm: () => {
      resolve(true)
      onConfirm?.()
    },
    onCancel: () => {
      resolve(false)
      onCancel?.()
    }
  })

  return { hasConfirmed }
}

function FeeInfoRow({
  mintInfo,
  transferFee,
  token
}: {
  mintInfo: TokenMintInfo
  transferFee: TokenAmount
  token: SplToken | undefined
}) {
  const reachedMax = gte(transferFee, mintInfo.maximumFee)
  return (
    <Col className={twMerge('table text-sm mx-auto py-4 gap-1 items-center text-[#abc4ff]')}>
      {reachedMax && isMeaningfulNumber(mintInfo.maximumFee) ? (
        <Row className="table-row">
          <Row className="table-cell px-2 font-medium">
            <Row className="font-medium items-center">
              <div>Max Transfer Fee</div>
              <Tooltip>
                <Icon iconClassName="ml-1" size="sm" heroIconName="information-circle" />
                <Tooltip.Panel>
                  <div className="max-w-[300px] space-y-1.5">
                    The maximum transfer fee collected regardless of the amount of tokens transferred
                  </div>
                </Tooltip.Panel>
              </Tooltip>
              <div className="ml-1">:</div>
            </Row>
          </Row>
          <div className="table-cell px-2">
            {toString(mintInfo.maximumFee, {
              decimalLength: `auto ${mintInfo.decimals}`
            })}{' '}
            {token?.symbol}
          </div>
        </Row>
      ) : (
        <>
          <Row className="table-row">
            <div className="table-cell px-2 font-medium">Transfer Fee:</div>
            <div className="table-cell px-2">
              {toString(transferFee)} {token?.symbol} ({toPercentString(mintInfo.transferFeePercent)})
            </div>
          </Row>

          <Row className="table-row">
            <div className="table-cell px-2 font-medium">Max Transfer Fee:</div>
            <div className="table-cell px-2">
              {toString(mintInfo.maximumFee, {
                decimalLength: `auto ${mintInfo.decimals}`
              })}{' '}
              {token?.symbol}
            </div>
          </Row>
        </>
      )}
    </Col>
  )
}

function InfoItemHeader({ coin }: { coin?: SplToken }) {
  return (
    <Row className="gap-2 p-4 bg-[#141041] rounded-xl justify-center">
      <Row className="gap-2 justify-center items-center text-[#abc4ff]">
        <CoinAvatar token={coin} />
        <div className="font-semibold">{coin?.symbol}</div>
        <AddressItem
          className="grow"
          showDigitCount={8}
          addressType="token"
          canCopy
          canExternalLink
          textClassName="text-[#abc4ff80] justify-start"
          iconClassName="text-[#abc4ff]"
        >
          {toPubString(coin?.mint)}
        </AddressItem>
      </Row>
    </Row>
  )
}
