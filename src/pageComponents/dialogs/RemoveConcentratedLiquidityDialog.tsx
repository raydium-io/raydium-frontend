import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { twMerge } from 'tailwind-merge'
import { AmmV3 } from '@raydium-io/raydium-sdk'

import useAppSettings from '@/application/common/useAppSettings'
import txDecreaseConcentrated from '@/application/concentrated/txDecreaseConcentrated'
import useConcentrated from '@/application/concentrated/useConcentrated'
import { routeTo } from '@/application/routeTools'
import useWallet from '@/application/wallet/useWallet'
import Button, { ButtonHandle } from '@/components/Button'
import Card from '@/components/Card'
import CoinInputBox, { CoinInputBoxHandle } from '@/components/CoinInputBox'
import Col from '@/components/Col'
import Icon from '@/components/Icon'
import ResponsiveDialogDrawer from '@/components/ResponsiveDialogDrawer'
import Row from '@/components/Row'
import toPubString from '@/functions/format/toMintString'
import toUsdVolume from '@/functions/format/toUsdVolume'
import { isMintEqual } from '@/functions/judgers/areEqual'
import { gt } from '@/functions/numberish/compare'
import { div } from '@/functions/numberish/operations'
import toFraction from '@/functions/numberish/toFraction'
import { toString } from '@/functions/numberish/toString'
import useConcentratedPendingYield from '@/hooks/useConcentratedPendingYield'
import useInit from '@/hooks/useInit'

import ConcentratedLiquiditySlider from '../ConcentratedRangeChart/ConcentratedLiquiditySlider'

export function RemoveConcentratedLiquidityDialog({ className, onClose }: { className?: string; onClose?(): void }) {
  useInit(() => {
    useConcentrated.setState({ coin1Amount: undefined, coin2Amount: undefined })
  })
  // cache for UI
  const open = useConcentrated((s) => s.isRemoveDialogOpen)
  const refreshConcentrated = useConcentrated((s) => s.refreshConcentrated)
  const walletConnected = useWallet((s) => s.connected)
  const isApprovePanelShown = useAppSettings((s) => s.isApprovePanelShown)
  const buttonComponentRef = useRef<ButtonHandle>()
  const coinInputBoxComponentRef1 = useRef<CoinInputBoxHandle>()
  const coinInputBoxComponentRef2 = useRef<CoinInputBoxHandle>()
  const currentAmmPool = useConcentrated((s) => s.currentAmmPool)
  const coinBase = currentAmmPool?.base
  const coinQuote = currentAmmPool?.quote
  const targetUserPositionAccount = useConcentrated((s) => s.targetUserPositionAccount)
  const originalCoin1 = useConcentrated((s) => s.coin1)
  const originalCoin1Amount = useConcentrated((s) => s.coin1Amount)
  const originalCoin2Amount = useConcentrated((s) => s.coin2Amount)
  const focusSide = isMintEqual(coinBase?.mint, originalCoin1?.mint) ? 'coin1' : 'coin2'
  const [amountBaseIsOutOfMax, setAmountBaseIsOutOfMax] = useState(false)
  const [amountBaseIsNegative, setAmountBaseIsNegative] = useState(false)
  const [amountQuoteIsOutOfMax, setAmountQuoteIsOutOfMax] = useState(false)
  const [amountQuoteIsNegative, setAmountQuoteIsNegative] = useState(false)
  const liquidity = useConcentrated((s) => s.liquidity)
  const pendingYield = useConcentratedPendingYield(targetUserPositionAccount)
  const isMobile = useAppSettings((s) => s.isMobile)
  const [maxInfo, setMaxInfo] = useState<{
    coin1Amount: string | undefined
    coin2Amount: string | undefined
  }>({
    coin1Amount: undefined,
    coin2Amount: undefined
  })

  useEffect(() => {
    if (!currentAmmPool || !targetUserPositionAccount) return
    const coin1 = currentAmmPool?.base
    const coin2 = currentAmmPool?.quote
    useConcentrated.setState({
      coin1,
      coin2,
      priceLowerTick: targetUserPositionAccount.tickLower,
      priceUpperTick: targetUserPositionAccount.tickUpper
    })
  }, [currentAmmPool, targetUserPositionAccount])

  const position = useMemo(() => {
    if (currentAmmPool && targetUserPositionAccount) {
      return currentAmmPool.positionAccount?.find(
        (p) => toPubString(p.nftMint) === toPubString(targetUserPositionAccount.nftMint)
      )
    }
    return undefined
  }, [currentAmmPool, targetUserPositionAccount])

  const calculateMaxLiquidity = useCallback(() => {
    if (!position || !currentAmmPool || !coinBase || !coinQuote) return
    const amountFromLiquidity = AmmV3.getAmountsFromLiquidity({
      poolInfo: currentAmmPool.state,
      ownerPosition: position,
      liquidity: position.liquidity,
      slippage: 0, // always 0, for remove liquidity only
      add: false
    })

    setMaxInfo({
      coin1Amount: toString(div(toFraction(amountFromLiquidity.amountSlippageA), 10 ** coinBase.decimals), {
        decimalLength: `auto ${coinBase.decimals}`
      }),
      coin2Amount: toString(div(toFraction(amountFromLiquidity.amountSlippageB), 10 ** coinQuote.decimals), {
        decimalLength: `auto ${coinQuote.decimals}`
      })
    })
  }, [currentAmmPool, position, coinBase, coinQuote])

  useEffect(() => {
    calculateMaxLiquidity()
  }, [calculateMaxLiquidity])

  const removeMaxLiquidity = useCallback(() => {
    if (!position?.liquidity || !maxInfo.coin1Amount || !maxInfo.coin2Amount) return
    useConcentrated.setState({
      coin1Amount: maxInfo.coin1Amount,
      coin2Amount: maxInfo.coin2Amount,
      isInput: true,
      liquidity: position.liquidity
    })
  }, [maxInfo, position])

  return (
    <ResponsiveDialogDrawer
      placement="from-bottom"
      open={open}
      onClose={() => {
        useConcentrated.setState({
          isRemoveDialogOpen: false,
          coin1Amount: undefined,
          coin2Amount: undefined
        })
      }}
    >
      {({ close: closeDialog }) => (
        <Card
          className={twMerge(
            'p-8 mobile:p-4 rounded-3xl w-[min(500px,90vw)] mobile:w-full border-1.5 border-[rgba(171,196,255,0.2)] bg-cyberpunk-card-bg shadow-cyberpunk-card',
            className
          )}
          size="lg"
        >
          <Row className="justify-between items-center mb-6 mobile:mb-3">
            <div className="mobile:text-base text-xl font-semibold text-white">
              Remove Liquidity from {coinBase?.symbol} - {coinQuote?.symbol}
            </div>
            <Icon className="text-[#ABC4FF] cursor-pointer" heroIconName="x" onClick={closeDialog} />
          </Row>

          <Col className="gap-3 mb-6 mobile:mb-4">
            {/* input-container-box */}

            <CoinInputBox
              componentRef={coinInputBoxComponentRef1}
              haveCoinIcon
              topLeftLabel={'Base'}
              topRightLabel={`Deposited: ${toString(targetUserPositionAccount?.amountA)}`}
              maxValue={maxInfo.coin1Amount}
              canFillFullBalance
              token={coinBase}
              value={toString(originalCoin1Amount, { decimalLength: `auto ${(coinBase?.decimals ?? 10) + 1}` })}
              onUserInput={(value) => {
                useConcentrated.setState({ isInput: true })
                if (focusSide === 'coin1') {
                  useConcentrated.setState({ coin1Amount: value, userCursorSide: 'coin1' })
                } else {
                  useConcentrated.setState({ coin2Amount: value, userCursorSide: 'coin2' })
                }
              }}
              onInputAmountClampInBalanceChange={({ negative, outOfMax }) => {
                setAmountBaseIsNegative(negative)
                setAmountBaseIsOutOfMax(outOfMax)
              }}
              onEnter={(input) => {
                if (!input) return
                buttonComponentRef.current?.click?.()
              }}
              onCustomMax={() => {
                removeMaxLiquidity()
              }}
            />

            {/* input-container-box 2 */}
            <CoinInputBox
              componentRef={coinInputBoxComponentRef2}
              haveCoinIcon
              topLeftLabel={'Quote'}
              topRightLabel={`Deposited: ${toString(targetUserPositionAccount?.amountB)}`}
              maxValue={maxInfo.coin2Amount}
              canFillFullBalance
              token={coinQuote}
              value={toString(originalCoin2Amount, { decimalLength: `auto ${(coinQuote?.decimals ?? 10) + 1}` })}
              onUserInput={(value) => {
                useConcentrated.setState({ isInput: true })
                if (focusSide === 'coin1') {
                  useConcentrated.setState({ coin2Amount: value, userCursorSide: 'coin2' })
                } else {
                  useConcentrated.setState({ coin1Amount: value, userCursorSide: 'coin1' })
                }
              }}
              onInputAmountClampInBalanceChange={({ negative, outOfMax }) => {
                setAmountQuoteIsNegative(negative)
                setAmountQuoteIsOutOfMax(outOfMax)
              }}
              onEnter={(input) => {
                if (!input) return
                buttonComponentRef.current?.click?.()
              }}
              onCustomMax={() => {
                removeMaxLiquidity()
              }}
            />
            <ConcentratedLiquiditySlider />
            <div className="py-3 px-3 ring-1 mobile:ring-1 ring-[#abc4ff40] rounded-xl mobile:rounded-xl ">
              <Row className="flex justify-between items-center text-[#ABC4FF] font-medium text-sm">
                <div className="text-base mobile:text-sm">Pending Yield</div>
                <div className="text-lg text-white">{toUsdVolume(pendingYield)}</div>
              </Row>
            </div>
          </Col>
          <Row className="flex-col gap-1">
            <Button
              size={isMobile ? 'sm' : undefined}
              className="frosted-glass frosted-glass-teal mobile:text-sm"
              isLoading={isApprovePanelShown}
              componentRef={buttonComponentRef}
              validators={[
                {
                  should: walletConnected,
                  forceActive: true,
                  fallbackProps: {
                    onClick: () => useAppSettings.setState({ isWalletSelectorShown: true }),
                    children: 'Connect Wallet'
                  }
                },
                {
                  should: !amountBaseIsOutOfMax,
                  fallbackProps: { children: `${coinBase?.symbol ?? ''} Amount Too Large` }
                },
                {
                  should: !amountBaseIsNegative,
                  fallbackProps: { children: `Negative ${coinBase?.symbol ?? ''} Amount` }
                },
                {
                  should: !amountQuoteIsOutOfMax,
                  fallbackProps: { children: `${coinQuote?.symbol ?? ''} Amount Too Large` }
                },
                {
                  should: !amountQuoteIsNegative,
                  fallbackProps: { children: `Negative ${coinQuote?.symbol ?? ''} Amount` }
                },
                {
                  should: gt(liquidity, 0),
                  fallbackProps: { children: `Enter Amount` }
                }
              ]}
              onClick={() => {
                txDecreaseConcentrated().then(({ allSuccess }) => {
                  if (allSuccess) {
                    onClose?.()
                    refreshConcentrated()
                    useConcentrated.setState({
                      isRemoveDialogOpen: false,
                      isMyPositionDialogOpen: false,
                      coin1Amount: undefined,
                      coin2Amount: undefined
                    })
                  }
                })
              }}
            >
              Withdraw Liquidity
            </Button>
            <Button
              size={isMobile ? 'sm' : undefined}
              type="text"
              className="text-sm mobile:text-xs text-[#ABC4FF] opacity-50 backdrop-filter-none"
              onClick={closeDialog}
            >
              Cancel
            </Button>
          </Row>
        </Card>
      )}
    </ResponsiveDialogDrawer>
  )
}
