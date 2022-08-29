import React, { useRef } from 'react'
import { twMerge } from 'tailwind-merge'

import useAppSettings from '@/application/appSettings/useAppSettings'
import txRemoveLiquidity from '@/application/liquidity/txRemoveLiquidity'
import { HydratedLiquidityInfo } from '@/application/liquidity/type'
import useLiquidity from '@/application/liquidity/useLiquidity'
import useWallet from '@/application/wallet/useWallet'
import Button, { ButtonHandle } from '@/components/Button'
import Card from '@/components/Card'
import CoinInputBox, { CoinInputBoxHandle } from '@/components/CoinInputBox'
import Dialog from '@/components/Dialog'
import Icon from '@/components/Icon'
import Row from '@/components/Row'
import { gt } from '@/functions/numberish/compare'
import useToken from '@/application/token/useToken'

export function RemoveLiquidityDialog({
  info,
  open,
  onClose,
  className
}: {
  info?: HydratedLiquidityInfo // if not specified, use liquidity's `currentHydratedInfo`
  open: boolean
  onClose: () => void
  className?: string
}) {
  const defaultHydratedInfo = useLiquidity((s) => s.currentHydratedInfo)
  const currentJsonInfo = useLiquidity((s) => s.currentJsonInfo)
  const getLpToken = useToken((s) => s.getLpToken)
  const lpToken = getLpToken(currentJsonInfo?.lpMint) // wait for hydratedInfo is slow, so use getLpToken
  const removeAmout = useLiquidity((s) => s.removeAmount)
  const walletConnected = useWallet((s) => s.connected)
  const isApprovePanelShown = useAppSettings((s) => s.isApprovePanelShown)

  const hydratedInfo = info ?? defaultHydratedInfo

  const [amountIsOutOfMax, setAmountIsOutOfMax] = React.useState(false)
  const [amountIsNegative, setAmountIsNegative] = React.useState(false)
  const coinInputBoxComponentRef = useRef<CoinInputBoxHandle>()
  const buttonComponentRef = useRef<ButtonHandle>()

  return (
    <Dialog
      open={open}
      onClose={() => {
        onClose()
        useLiquidity.setState({ removeAmount: '' })
        setAmountIsNegative(false)
        setAmountIsOutOfMax(false)
      }}
    >
      {({ close: closeDialog }) => (
        <Card
          className={twMerge(
            'backdrop-filter backdrop-blur-xl p-8 rounded-3xl w-[min(456px,90vw)] border-1.5 border-[rgba(171,196,255,0.2)] bg-cyberpunk-card-bg shadow-cyberpunk-card',
            className
          )}
          size="lg"
        >
          <Row className="justify-between items-center mb-6">
            <div className="text-xl font-semibold text-white">Stake LP</div>
            <Icon className="text-[#ABC4FF] cursor-pointer" heroIconName="x" onClick={closeDialog} />
          </Row>

          {/* input-container-box */}
          <CoinInputBox
            className="mb-6"
            componentRef={coinInputBoxComponentRef}
            topLeftLabel="Pool"
            token={lpToken}
            onUserInput={(value) => {
              useLiquidity.setState({ removeAmount: value })
            }}
            onInputAmountClampInBalanceChange={({ negative, outOfMax }) => {
              negative ? setAmountIsNegative(true) : setAmountIsNegative(false)
              outOfMax ? setAmountIsOutOfMax(true) : setAmountIsOutOfMax(false)
            }}
            onEnter={(input) => {
              if (!input) return
              buttonComponentRef.current?.click?.()
            }}
          />

          <Row className="flex-col gap-1">
            <Button
              className="frosted-glass frosted-glass-teal"
              isLoading={isApprovePanelShown}
              componentRef={buttonComponentRef}
              validators={[
                { should: gt(removeAmout, 0) },

                // { should: value is smaller than balance, but larget than zero },
                { should: !amountIsOutOfMax, fallbackProps: { children: 'Amount Too Large' } },
                { should: !amountIsNegative, fallbackProps: { children: `Negative Amount` } },
                {
                  should: walletConnected,
                  forceActive: true,
                  fallbackProps: {
                    onClick: () => useAppSettings.setState({ isWalletSelectorShown: true }),
                    children: 'Connect Wallet'
                  }
                }
              ]}
              onClick={() => {
                txRemoveLiquidity({ ammId: hydratedInfo?.id }).then(() => {
                  useLiquidity.setState({ removeAmount: '' })
                  setAmountIsNegative(false)
                  setAmountIsOutOfMax(false)
                })
              }}
            >
              Remove Liquidity
            </Button>
            <Button
              type="text"
              className="text-sm text-[#ABC4FF] opacity-50 backdrop-filter-none"
              onClick={closeDialog}
            >
              Cancel
            </Button>
          </Row>
        </Card>
      )}
    </Dialog>
  )
}
