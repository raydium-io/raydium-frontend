import assert from '@/functions/assert'
import toFraction from '@/functions/numberish/toFraction'
import { toString } from '@/functions/numberish/toString'
import { AmmV3 } from '@raydium-io/raydium-sdk'
import { Keypair } from '@solana/web3.js'
import { useEffect } from 'react'
import useConnection from '../connection/useConnection'
import { isQuantumSOLVersionSOL } from '../token/quantumSOL'
import { getAmmV3ProgramId } from '../token/wellknownProgram.config'
import { SOLMint } from '../token/wellknownToken.config'
import { fractionToDecimal } from '../txTools/decimal2Fraction'
import { jsonInfo2PoolKeys } from '../txTools/jsonInfo2PoolKeys'
import useWallet from '../wallet/useWallet'
import hydrateConcentratedInfo from './hydrateConcentratedInfo'
import useConcentrated from './useConcentrated'

export function useAutoCreateAmmv3Pool() {
  const { coin1, coin2, userSelectedAmmConfigFeeOption, userSettedCurrentPrice } = useConcentrated()
  const connection = useConnection((s) => s.connection)
  const owner = useWallet((s) => s.owner)

  useEffect(() => {
    if (owner && connection && coin1 && coin2 && userSettedCurrentPrice && userSelectedAmmConfigFeeOption) {
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
  const { coin1, coin2, userSelectedAmmConfigFeeOption, userSettedCurrentPrice } = useConcentrated.getState()
  const { connection } = useConnection.getState()
  const { owner } = useWallet.getState()
  assert(connection, 'connection is not ready')
  assert(owner, 'wallet is not connected')
  assert(coin1, 'not set coin1')
  assert(coin2, 'not set coin2')
  assert(userSelectedAmmConfigFeeOption, 'not set userSelectedAmmConfigFeeOption')
  assert(userSettedCurrentPrice, 'not set userSettedCurrentPrice')
  const { transaction, signers, mockPoolInfo } = await AmmV3.makeCreatePoolTransaction({
    connection: connection,
    programId: getAmmV3ProgramId(),
    mint1: { mint: coin1.mint, decimals: coin1.decimals },
    mint2: { mint: coin2.mint, decimals: coin2.decimals },
    ammConfig: jsonInfo2PoolKeys(userSelectedAmmConfigFeeOption.original),
    initialPrice: fractionToDecimal(toFraction(userSettedCurrentPrice)),
    owner
  })
  useConcentrated.setState({
    tempDataCache: {
      transaction,
      signers: signers as Keypair[]
    }
  })
  useConcentrated.setState({ loading: true })
  const hydratedInfo = hydrateConcentratedInfo({ state: mockPoolInfo })
  useConcentrated.setState({ currentAmmPool: hydratedInfo, loading: false })
}
