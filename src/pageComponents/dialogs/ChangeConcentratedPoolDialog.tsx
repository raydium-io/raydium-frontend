import useAppSettings from '@/application/appSettings/useAppSettings'
import txIncreaseConcentrated from '@/application/concentrated/txIncreaseConcentrated'
import useConcentrated from '@/application/concentrated/useConcentrated'
import useWallet from '@/application/wallet/useWallet'
import Button, { ButtonHandle } from '@/components/Button'
import Card from '@/components/Card'
import { CoinInputBoxHandle } from '@/components/CoinInputBox'
import Dialog from '@/components/Dialog'
import Icon from '@/components/Icon'
import Row from '@/components/Row'
import { useRef } from 'react'
import { twMerge } from 'tailwind-merge'

export function ChangeConcentratedPoolDialog({
  className,
  open,
  mode,
  onClose
}: {
  className?: string
  open: boolean
  mode?: 'add' | 'remove'
  onClose?(): void
}) {
  const walletConnected = useWallet((s) => s.connected)
  const isApprovePanelShown = useAppSettings((s) => s.isApprovePanelShown)
  const buttonComponentRef = useRef<ButtonHandle>()
  const coinInputBoxComponentRef = useRef<CoinInputBoxHandle>()
  return (
    <Dialog
      open={open}
      onClose={() => {
        onClose?.()
        useConcentrated.setState({
          isAddDialogOpen: true,
          isRemoveDialogOpen: true
        })
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
            <div className="text-xl font-semibold text-white">{mode === 'add' ? 'Add' : 'Remove'} Concentrated</div>
            <Icon className="text-[#ABC4FF] cursor-pointer" heroIconName="x" onClick={closeDialog} />
          </Row>

          {/* input-container-box
          <CoinInputBox
            className="mb-6"
            // componentRef={coinInputBoxComponentRef}
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
          /> */}

          <Row className="flex-col gap-1">
            <Button
              className="frosted-glass frosted-glass-teal"
              isLoading={isApprovePanelShown}
              componentRef={buttonComponentRef}
              validators={
                [
                  // { should: gt(removeAmout, 0) },
                  // // { should: value is smaller than balance, but larget than zero },
                  // { should: !amountIsOutOfMax, fallbackProps: { children: 'Amount Too Large' } },
                  // { should: !amountIsNegative, fallbackProps: { children: `Negative Amount` } },
                  // {
                  //   should: walletConnected,
                  //   forceActive: true,
                  //   fallbackProps: {
                  //     onClick: () => useAppSettings.setState({ isWalletSelectorShown: true }),
                  //     children: 'Connect Wallet'
                  //   }
                  // }
                ]
              }
              onClick={() => {
                txIncreaseConcentrated().then(() => {
                  onClose?.()
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
