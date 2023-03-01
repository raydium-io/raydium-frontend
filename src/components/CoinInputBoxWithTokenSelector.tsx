import CoinInputBox, { CoinInputBoxProps } from './CoinInputBox'
import TokenSelectorDialog, { TokenSelectorProps } from '../pageComponents/dialogs/TokenSelectorDialog'
import useToggle from '@/hooks/useToggle'

export type CoinInputBoxWithSelectorProps = Omit<CoinInputBoxProps, 'haveCoinIcon' | 'showTokenSelectIcon'> &
  Pick<TokenSelectorProps, 'onSelectToken' | 'enableTokens' | 'disableTokens' | 'canSelectQuantumSOL'> & {
    tokenSelectorProps?: Partial<Omit<TokenSelectorProps, 'open' | 'close'>>
  }

// TODO: split into different customized component (to handle different use cases)
/**
 * support to input both token and lpToken
 */
export default function CoinInputBoxWithTokenSelector({ tokenSelectorProps, ...props }: CoinInputBoxWithSelectorProps) {
  const [isCoinSelectorOn, { on: turnOnCoinSelector, off: turnOffCoinSelector }] = useToggle()
  return (
    <>
      <CoinInputBox
        {...props}
        haveCoinIcon
        showTokenSelectIcon={!props.disableTokenSelect}
        onTryToTokenSelect={() => {
          turnOnCoinSelector()
          props.onTryToTokenSelect?.()
        }}
      />
      <TokenSelectorDialog
        {...tokenSelectorProps}
        disableTokens={props.disableTokens}
        enableTokens={props.enableTokens}
        canSelectQuantumSOL={props.canSelectQuantumSOL}
        open={isCoinSelectorOn}
        onSelectToken={(token) => {
          turnOffCoinSelector()
          props.onSelectToken?.(token)
        }}
        onClose={turnOffCoinSelector}
      />
    </>
  )
}
