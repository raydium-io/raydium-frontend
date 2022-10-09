import assert from '@/functions/assert'
import toFraction from '@/functions/numberish/toFraction'
import { AmmV3 } from '@raydium-io/raydium-sdk'
import useConnection from '../connection/useConnection'
import { isQuantumSOLVersionSOL } from '../token/quantumSOL'
import { ammV3ProgramId } from '../token/wellknownProgram.config'
import { SOLMint } from '../token/wellknownToken.config'
import { loadTransaction } from '../txTools/createTransaction'
import { fractionToDecimal } from '../txTools/decimal2Fraction'
import txHandler from '../txTools/handleTx'
import { jsonInfo2PoolKeys } from '../txTools/jsonInfo2PoolKeys'
import useWallet from '../wallet/useWallet'
import hydrateConcentratedInfo from './hydrateConcentratedInfo'
import useConcentrated from './useConcentrated'

export async function createNewConcentratedPool() {
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
    programId: ammV3ProgramId,
    mint1: { mint: isQuantumSOLVersionSOL(coin1) ? SOLMint : coin1.mint, decimals: coin1.decimals },
    mint2: { mint: isQuantumSOLVersionSOL(coin2) ? SOLMint : coin2.mint, decimals: coin2.decimals },
    ammConfig: jsonInfo2PoolKeys(userSelectedAmmConfigFeeOption.original),
    initialPrice: fractionToDecimal(toFraction(userSettedCurrentPrice)),
    owner
  })
  useConcentrated.setState({
    tempDataCache: {
      transaction,
      signers
    }
  })
  useConcentrated.setState({ loading: true })
  const hydratedInfo = hydrateConcentratedInfo({ state: mockPoolInfo })
  useConcentrated.setState({ currentAmmPool: hydratedInfo, loading: false })
}

export default function txCreateNewConcentratedPool() {
  return txHandler(async ({ transactionCollector, baseUtils: { connection, owner, allTokenAccounts } }) => {
    const { tempDataCache } = useConcentrated.getState()
    assert(tempDataCache, 'should create pool first')
    const { transaction, signers } = tempDataCache
    transactionCollector.add(await loadTransaction({ transaction: transaction, signers: signers }), {
      txHistoryInfo: {
        title: 'Create pool',
        description: `create new clmm pool`
      }
    })
  })
}
