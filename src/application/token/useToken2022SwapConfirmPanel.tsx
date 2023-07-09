import { isToken2022 } from '@/application/token/isToken2022'
import { SplToken, Token } from '@/application/token/type'
import { AddressItem } from '@/components/AddressItem'
import Button from '@/components/Button'
import Card from '@/components/Card'
import { Checkbox } from '@/components/Checkbox'
import CoinAvatar from '@/components/CoinAvatar'
import Col from '@/components/Col'
import Icon from '@/components/Icon'
import LoadingCircle from '@/components/LoadingCircle'
import ResponsiveDialogDrawer from '@/components/ResponsiveDialogDrawer'
import Row from '@/components/Row'
import { unifyItem } from '@/functions/arrayMethods'
import { capitalize } from '@/functions/changeCase'
import toPubString from '@/functions/format/toMintString'
import toPercentString from '@/functions/format/toPercentString'
import { toString } from '@/functions/numberish/toString'
import useLocalStorageItem from '@/hooks/useLocalStorage'
import { HexAddress } from '@/types/constants'
import { useCallback, useEffect, useState } from 'react'
import { twMerge } from 'tailwind-merge'
import { AsyncAwait } from '../../components/AsyncAwait'
import { getOnlineTokenInfo } from './getOnlineTokenInfo'
import { isTransactableToken, parseMintInfo } from './parseMintInfo'

/**
 * not just data, also ui
 */
export function useToken2022SwapConfirmPanel({
  token,
  onCancel,
  onConfirm
}: {
  token: SplToken | undefined
  onCancel?(): void
  onConfirm?(): void
}) {
  const mint = toPubString(token?.mint)
  const tokenIsToken2022 = token && isToken2022(token)

  const [userConfirmedList, setUserConfirmedList] =
    useLocalStorageItem<HexAddress /* mints */[]>('USER_CONFIRMED_TOKEN_2022')
  const isInPermanentConfirmedList = userConfirmedList?.includes(mint)

  // permanent state
  const [hasUserPermanentConfirmed, setHasUserPermanentConfirmed] = useState(() =>
    Boolean(token && isInPermanentConfirmedList)
  )
  // temporary state
  const [hasUserTemporaryConfirmed, setHasUserTemporaryConfirmed] = useState(false)

  const needCheck = tokenIsToken2022 && !isInPermanentConfirmedList
  const [hasUserWatchDialog, setHasUserWatchDialog] = useState(false)

  useEffect(() => {
    setHasUserTemporaryConfirmed(false)
    setHasUserPermanentConfirmed(false)
    setHasUserWatchDialog(false)
  }, [mint])

  const TokenConfirmDialog = (
    <ConfirmDialog
      onConfirm={() => {
        onConfirm?.()
        if (hasUserPermanentConfirmed) setUserConfirmedList((list) => unifyItem([...(list ?? []), mint]))
        setHasUserWatchDialog(true)
      }}
      onCancel={() => {
        onCancel?.()
        setHasUserWatchDialog(true)
      }}
      onPermanentlyConfirm={setHasUserPermanentConfirmed}
      onTemporarilyConfirm={setHasUserTemporaryConfirmed}
      open={needCheck && !hasUserWatchDialog}
      token={token}
      temporarilyConfirm={hasUserTemporaryConfirmed}
      permanentlyConfirm={hasUserPermanentConfirmed}
    />
  )
  return { ConfirmDialog: TokenConfirmDialog }
}

function ConfirmDialog({
  open,
  token,
  className,
  temporarilyConfirm,
  permanentlyConfirm,
  onTemporarilyConfirm,
  onPermanentlyConfirm,
  onCancel,
  onConfirm
}: {
  open?: boolean
  className?: string
  token?: Token
  temporarilyConfirm?: boolean
  permanentlyConfirm?: boolean
  onTemporarilyConfirm?: (checkState: boolean) => void
  onPermanentlyConfirm?: (checkState: boolean) => void
  onCancel?(): void
  onConfirm?(): void
}) {
  if (!token) return null
  const info = getOnlineTokenInfo(token.mint).catch(() => {})
  if (!info) return null
  const [canConfirm, setCanConfirm] = useState<boolean>(false)
  return (
    <ResponsiveDialogDrawer placement="from-bottom" open={Boolean(open)} canClosedByMask onCloseImmediately={onCancel}>
      <Card
        className={twMerge(
          `flex flex-col p-8 mobile:p-5 rounded-3xl mobile:rounded-b-none mobile:h-[80vh] w-[min(552px,100vw)] mobile:w-full border-1.5 border-[rgba(171,196,255,0.2)]`
        )}
        size="lg"
        style={{
          background:
            'linear-gradient(140.14deg, rgba(0, 182, 191, 0.15) 0%, rgba(27, 22, 89, 0.1) 86.61%), linear-gradient(321.82deg, #18134D 0%, #1B1659 100%)',
          boxShadow: '0px 8px 48px rgba(171, 196, 255, 0.12)'
        }}
      >
        <Col className="items-center">
          <Icon size="lg" heroIconName="exclamation" className={`text-[#D8CB39] mb-3`} />

          <div className="mb-6 text-center">
            <div className="font-semibold text-xl text-white mb-3">Confirm Token 2022</div>
            <div className="font-normal text-base text-[#ABC4FF]">
              <div>
                <p className="mb-2 text-center">
                  This token uses the Token2022 program that is unaudited and still in beta. This is an advanced
                  feature, trade with caution.
                </p>
                <p className="text-center">
                  The Token2022 program includes Extensions, like Transfer Fees and other transfer restrictions, which
                  can be changed. You will need a wallet that supports Token2022, like Backpack.
                </p>
              </div>
            </div>
          </div>

          <div className="self-stretch">
            <div className="pb-4">
              <div>
                <Col className="bg-[#abc4ff1a] rounded-xl w-full">
                  <Row className="justify-center items-center gap-2 p-4 rounded-xl bg-[#141041]">
                    <CoinAvatar token={token} />
                    <div className="font-semibold">{token?.symbol}</div>
                    <AddressItem textClassName="text-[#abc4ff80]" showDigitCount={8} canExternalLink>
                      {token?.mint}
                    </AddressItem>
                  </Row>
                  <div className="self-center py-3">
                    <AsyncAwait
                      promise={info}
                      onFullfilled={(tokenMintInfo) => {
                        if (!tokenMintInfo) return
                        const { isTransferable } = parseMintInfo(tokenMintInfo)
                        setCanConfirm(isTransferable)
                      }}
                      fallback={<LoadingCircle className="mx-auto" />}
                    >
                      {(tokenMintInfo) => {
                        if (!tokenMintInfo) return
                        const { isTransferable } = parseMintInfo(tokenMintInfo)
                        return (
                          <div>
                            <Col className="table text-sm">
                              <Row className="table-row">
                                <div className="table-cell px-2 font-medium">Frozen:</div>
                                <div className="table-cell px-2">
                                  {capitalize(String(Boolean(tokenMintInfo.freezeAuthority)))}
                                </div>
                              </Row>
                              <Row className="table-row">
                                <div className="table-cell px-2 font-medium">Transfer Fee:</div>
                                <div className="table-cell px-2">
                                  {toPercentString(tokenMintInfo.transferFeePercent)}
                                </div>
                              </Row>
                              <Row className="table-row">
                                <div className="table-cell px-2 font-medium">Max Transfer Fee:</div>
                                <div className="table-cell px-2">
                                  {toString(tokenMintInfo.maximumFee, {
                                    decimalLength: `auto ${tokenMintInfo.decimals}`
                                  })}{' '}
                                  {token.symbol}
                                </div>
                              </Row>
                            </Col>

                            {!isTransferable && (
                              <div className="mt-4">
                                <span className="text-sm italic text-[#da3eef]">
                                  This token can't make any transaction
                                </span>
                              </div>
                            )}
                          </div>
                        )
                      }}
                    </AsyncAwait>
                  </div>
                </Col>

                <Checkbox
                  checkBoxSize="sm"
                  disabled={!canConfirm}
                  className="my-2 w-max"
                  checked={temporarilyConfirm}
                  onChange={onTemporarilyConfirm}
                  label={
                    <div className="text-sm italic text-[rgba(171,196,255,0.5)]">
                      I understand the program is unaudited and accept the risks.
                    </div>
                  }
                />

                <Checkbox
                  checkBoxSize="sm"
                  disabled={!canConfirm}
                  className="my-2 w-max"
                  checked={permanentlyConfirm}
                  onChange={onPermanentlyConfirm}
                  label={
                    <div className="text-sm italic text-[rgba(171,196,255,0.5)]">Do not warn again for this token.</div>
                  }
                />
              </div>
            </div>
            <Col className="w-full">
              <Button
                disabled={!temporarilyConfirm}
                className="text-[#ABC4FF] frosted-glass-skygray"
                onClick={onConfirm}
              >
                Confirm
              </Button>

              <Button className={`text-[#ABC4FF] text-sm -mb-4`} type="text" onClick={onCancel}>
                Cancel
              </Button>
            </Col>
          </div>
        </Col>
      </Card>
    </ResponsiveDialogDrawer>
  )
}
