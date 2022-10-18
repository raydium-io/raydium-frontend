import { Token, TokenAmount } from 'test-r-sdk'

import { SplToken } from '@/application/token/type'
import { toTokenAmount } from '@/functions/format/toTokenAmount'
import toFraction from '@/functions/numberish/toFraction'

export default function computeUserLedgerInfo(
  pairInfo: {
    tokenAmountBase: TokenAmount | null // may have decimal
    tokenAmountQuote: TokenAmount | null // may have decimal
    tokenAmountLp: TokenAmount | null // may have decimal
  },
  additionalTools: {
    lpToken: SplToken | undefined
    quoteToken: SplToken | undefined
    baseToken: SplToken | undefined
    lpBalance: TokenAmount | undefined
  }
) {
  if (!pairInfo.tokenAmountBase || !pairInfo.tokenAmountQuote || !pairInfo.tokenAmountLp)
    return { basePooled: undefined, quotePooled: undefined, lpPooled: undefined }

  const sharePercent = additionalTools.lpBalance?.div(toFraction(pairInfo.tokenAmountLp))
  const basePooled =
    additionalTools.baseToken && sharePercent
      ? toTokenAmount(additionalTools.baseToken, sharePercent.mul(toFraction(pairInfo.tokenAmountBase)), {
        alreadyDecimaled: true
      })
      : undefined
  const quotePooled =
    additionalTools.quoteToken && sharePercent
      ? toTokenAmount(additionalTools.quoteToken, sharePercent.mul(toFraction(pairInfo.tokenAmountQuote)), {
        alreadyDecimaled: true
      })
      : undefined

  return {
    basePooled,
    quotePooled,
    sharePercent
  }
}
