import BN from 'bn.js'

import toFraction from '@/functions/numberish/toFraction'
import { HexAddress } from '@/types/constants'
import { TokenAmount } from '@raydium-io/raydium-sdk'

import toBN from '../../functions/numberish/toBN'
import { LpToken, SplToken } from '../token/type'
import { HydratedConcentratedInfo, SDKParsedConcentratedInfo } from './type'
import { toPercent } from '@/functions/format/toPercent'
import { div } from '@/functions/numberish/operations'

export default function hydrateConcentratedInfo(
  concentratedInfo: SDKParsedConcentratedInfo
  // additionalTools: {
  //   getToken: (mint: HexAddress) => SplToken | undefined
  //   getLpToken: (mint: HexAddress) => LpToken | undefined
  //   lpBalance: BN | undefined
  // }
): HydratedConcentratedInfo {
  return {
    ...concentratedInfo,
    protocolFeeRate: toPercent(div(concentratedInfo.state.ammConfig.protocolFeeRate, 10 ** 8)),
    tradeFeeRate: toPercent(div(concentratedInfo.state.ammConfig.tradeFeeRate, 10 ** 8))
  }
}
