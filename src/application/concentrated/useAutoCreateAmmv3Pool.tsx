import assert from '@/functions/assert'
import { isMeaningfulNumber } from '@/functions/numberish/compare'
import { div } from '@/functions/numberish/operations'
import toFraction from '@/functions/numberish/toFraction'
import { toString } from '@/functions/numberish/toString'
import { AmmV3, AmmV3ConfigInfo } from '@raydium-io/raydium-sdk'
import { PublicKey } from '@solana/web3.js'
import { useEffect } from 'react'
import useConnection from '../connection/useConnection'
import { SDK_PROGRAM_IDS } from '../token/wellknownProgram.config'
import { fractionToDecimal } from '../txTools/decimal2Fraction'
import { getComputeBudgetConfig } from '../txTools/getComputeBudgetConfig'
import { jsonInfo2PoolKeys } from '../txTools/jsonInfo2PoolKeys'
import useWallet from '../wallet/useWallet'
import hydrateConcentratedInfo from './hydrateConcentratedInfo'
import useConcentrated from './useConcentrated'

export function useAutoCreateAmmv3Pool() {
  const { coin1, coin2, userSelectedAmmConfigFeeOption, userSettedCurrentPrice } = useConcentrated()
  const connection = useConnection((s) => s.connection)
  const owner = useWallet((s) => s.owner)

  useEffect(() => {
    if (connection && coin1 && coin2 && userSettedCurrentPrice && userSelectedAmmConfigFeeOption) {
      createNewConcentratedPool()
    }
  }, [
    toString(userSettedCurrentPrice),
    coin1,
    coin2,
    userSelectedAmmConfigFeeOption,
    userSettedCurrentPrice,
    owner,
    connection
  ])
}

async function createNewConcentratedPool() {
  const { coin1, coin2, userSelectedAmmConfigFeeOption, userSettedCurrentPrice, focusSide } = useConcentrated.getState()
  const { connection } = useConnection.getState()
  const { owner } = useWallet.getState()
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

  const { innerTransactions, address } = await AmmV3.makeCreatePoolInstructionSimple({
    connection: connection,
    programId: SDK_PROGRAM_IDS.CLMM,
    mint1: { mint: coin1.mint, decimals: coin1.decimals },
    mint2: { mint: coin2.mint, decimals: coin2.decimals },
    ammConfig: jsonInfo2PoolKeys(userSelectedAmmConfigFeeOption.original) as unknown as AmmV3ConfigInfo,
    initialPrice: fractionToDecimal(currentPrice, 15),
    owner: owner ?? PublicKey.default,
    computeBudgetConfig: await getComputeBudgetConfig()
  })
  const mockPoolInfo = AmmV3.makeMockPoolInfo({
    ammConfig: jsonInfo2PoolKeys(userSelectedAmmConfigFeeOption.original) as unknown as AmmV3ConfigInfo,
    mint1: { mint: coin1.mint, decimals: coin1.decimals },
    mint2: { mint: coin2.mint, decimals: coin2.decimals },
    owner: owner ?? PublicKey.default,
    programId: SDK_PROGRAM_IDS.CLMM,
    createPoolInstructionSimpleAddress: address
  })
  useConcentrated.setState({
    tempDataCache: innerTransactions
  })
  useConcentrated.setState({ currentAmmPool: hydrateConcentratedInfo({ state: mockPoolInfo }) })
}
