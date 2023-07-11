import assert from '@/functions/assert'
import { isMeaningfulNumber } from '@/functions/numberish/compare'
import { div } from '@/functions/numberish/operations'
import toBN from '@/functions/numberish/toBN'
import toFraction from '@/functions/numberish/toFraction'
import { toString } from '@/functions/numberish/toString'
import { AmmV3, AmmV3ConfigInfo } from '@raydium-io/raydium-sdk'
import { PublicKey } from '@solana/web3.js'
import { useEffect, useRef } from 'react'
import useAppAdvancedSettings from '../common/useAppAdvancedSettings'
import useConnection from '../connection/useConnection'
import { getTokenProgramId } from '../token/isToken2022'
import { fractionToDecimal } from '../txTools/decimal2Fraction'
import { getComputeBudgetConfig } from '../txTools/getComputeBudgetConfig'
import { jsonInfo2PoolKeys } from '../txTools/jsonInfo2PoolKeys'
import useWallet from '../wallet/useWallet'
import hydrateConcentratedInfo from './hydrateConcentratedInfo'
import useConcentrated from './useConcentrated'

export function useAutoCreateAmmv3Pool() {
  const { coin1, coin2, userSelectedAmmConfigFeeOption, userSettedCurrentPrice, ammPoolStartTime } = useConcentrated()
  const connection = useConnection((s) => s.connection)
  const owner = useWallet((s) => s.owner)

  const newestPerformanceStamp = useRef(-1)

  function isNewest(performanceStamp: number) {
    return newestPerformanceStamp.current <= performanceStamp
  }

  useEffect(() => {
    if (connection && coin1 && coin2 && userSettedCurrentPrice && userSelectedAmmConfigFeeOption) {
      const startTimePerformanceStamp = globalThis.performance.now()
      newestPerformanceStamp.current = Math.max(startTimePerformanceStamp, newestPerformanceStamp.current)
      createNewConcentratedPool({ timestamp: globalThis.performance.now() })
        .then(({ mockedPoolInfo, makePoolInstruction: innerTransactions }) => {
          if (isNewest(startTimePerformanceStamp)) {
            useConcentrated.setState({
              tempDataCache: innerTransactions,
              currentAmmPool: hydrateConcentratedInfo({ state: mockedPoolInfo })
            })
          }
        })
        .catch(() => {
          useConcentrated.setState({
            tempDataCache: undefined,
            currentAmmPool: undefined
          })
        })
    }
  }, [
    toString(userSettedCurrentPrice),
    coin1,
    coin2,
    userSelectedAmmConfigFeeOption,
    userSettedCurrentPrice,
    ammPoolStartTime,
    owner,
    connection
  ])
}

async function createNewConcentratedPool({ timestamp: number }) {
  const { coin1, coin2, userSelectedAmmConfigFeeOption, userSettedCurrentPrice, focusSide, ammPoolStartTime } =
    useConcentrated.getState()
  const { connection } = useConnection.getState()
  const { owner } = useWallet.getState()
  const { programIds } = useAppAdvancedSettings.getState()
  assert(connection, 'connection is not ready')
  assert(coin1, 'not set coin1')
  assert(coin2, 'not set coin2')
  assert(userSelectedAmmConfigFeeOption, 'not set userSelectedAmmConfigFeeOption')
  assert(userSettedCurrentPrice, 'not set userSettedCurrentPrice')

  const currentPrice = isMeaningfulNumber(userSettedCurrentPrice)
    ? focusSide === 'coin1'
      ? toFraction(userSettedCurrentPrice)
      : div(1, userSettedCurrentPrice)
    : toFraction(0)

  const startTime = toBN((ammPoolStartTime?.getTime() ?? 0) / 1000)
  const mint1TokenProgramId = getTokenProgramId(coin1.mint)
  const mint2TokenProgramId = getTokenProgramId(coin2.mint)
  const { innerTransactions, address } = await AmmV3.makeCreatePoolInstructionSimple({
    connection: connection,
    programId: programIds.CLMM,
    mint1: { programId: mint1TokenProgramId, mint: coin1.mint, decimals: coin1.decimals },
    mint2: { programId: mint2TokenProgramId, mint: coin2.mint, decimals: coin2.decimals },
    ammConfig: jsonInfo2PoolKeys(userSelectedAmmConfigFeeOption.original) as unknown as AmmV3ConfigInfo,
    initialPrice: fractionToDecimal(currentPrice, 15),
    owner: owner ?? PublicKey.default,
    computeBudgetConfig: await getComputeBudgetConfig(),
    startTime
  })
  const mockedPoolInfo = AmmV3.makeMockPoolInfo({
    ammConfig: jsonInfo2PoolKeys(userSelectedAmmConfigFeeOption.original) as unknown as AmmV3ConfigInfo,
    mint1: { programId: mint1TokenProgramId, mint: coin1.mint, decimals: coin1.decimals },
    mint2: { programId: mint2TokenProgramId, mint: coin2.mint, decimals: coin2.decimals },
    owner: owner ?? PublicKey.default,
    programId: programIds.CLMM,
    createPoolInstructionSimpleAddress: address,
    initialPrice: fractionToDecimal(currentPrice, 15),
    startTime
  })
  return { mockedPoolInfo, makePoolInstruction: innerTransactions }
}
