import assert from '@/functions/assert'
import toFraction from '@/functions/numberish/toFraction'
import { toString } from '@/functions/numberish/toString'
import { AmmV3 } from '@raydium-io/raydium-sdk'
import { Keypair, PublicKey } from '@solana/web3.js'
import { useEffect } from 'react'
import useConnection from '../connection/useConnection'
import { getAmmV3ProgramId } from '../token/wellknownProgram.config'
import { fractionToDecimal } from '../txTools/decimal2Fraction'
import { jsonInfo2PoolKeys } from '../txTools/jsonInfo2PoolKeys'
import useWallet from '../wallet/useWallet'
import hydrateConcentratedInfo from './hydrateConcentratedInfo'
import useConcentrated from './useConcentrated'
import { div } from '@/functions/numberish/operations'
import { isMeaningfulNumber } from '@/functions/numberish/compare'

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

  const { transaction, signers, mockPoolInfo } = await AmmV3.makeCreatePoolTransaction({
    connection: connection,
    programId: getAmmV3ProgramId(),
    mint1: { mint: coin1.mint, decimals: coin1.decimals },
    mint2: { mint: coin2.mint, decimals: coin2.decimals },
    ammConfig: jsonInfo2PoolKeys(userSelectedAmmConfigFeeOption.original),
    initialPrice: fractionToDecimal(currentPrice),
    owner: owner ?? PublicKey.default
  })
  useConcentrated.setState({
    tempDataCache: {
      transaction,
      signers: signers as Keypair[]
    }
  })
  useConcentrated.setState({ loading: true })

  // const hasReverse = coin1.mint !== mockPoolInfo.mintA.mint
  // if (hasReverse) {
  //   useConcentrated.setState({
  //     focusSide: hasReverse ? 'coin2' : 'coin1',
  //     userCursorSide: hasReverse ? 'coin2' : 'coin1'
  //   })
  // }
  useConcentrated.setState({ currentAmmPool: hydrateConcentratedInfo({ state: mockPoolInfo }), loading: false })
}
