import { SignatureResult } from '@solana/web3.js'
import { TxErrorCallback } from '.'

export const globalErrorHandlers: TxErrorCallback[] = [
  ({ signatureResult, changeHistoryInfo }) => {
    if (checkPositionSlippageError(signatureResult)) {
      changeHistoryInfo?.({
        forceErrorTitle: 'Deposit failed due to slippage error!',
        description: 'Slippage has exceeded user settings. \nTry again or adjust your slippage tolerance.'
      })
    }
  }
]
/**
 * slippage error
 * @author RUDY
 */
export function checkPositionSlippageError(err: SignatureResult): boolean {
  try {
    // @ts-expect-error force
    const coustom = err.err?.InstructionError[1].Custom
    if ([6021].includes(coustom)) {
      return true
    } else {
      return false
    }
  } catch {
    return false
  }
}
