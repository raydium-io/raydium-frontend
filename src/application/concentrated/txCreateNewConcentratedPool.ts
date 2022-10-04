import { AmmV3 } from 'test-r-sdk'

import assert from '@/functions/assert'
import toPubString, { toPub } from '@/functions/format/toMintString'
import { eq, isMeaningfulNumber } from '@/functions/numberish/compare'
import { toString } from '@/functions/numberish/toString'

import useAppSettings from '../appSettings/useAppSettings'
import { loadTransaction } from '../txTools/createTransaction'
import handleMultiTx from '../txTools/handleMultiTx'
import useWallet from '../wallet/useWallet'

import { HydratedConcentratedInfo, UserPositionAccount } from './type'
import useConcentrated from './useConcentrated'
import { ammV3ProgramId } from '../token/wellknownProgram.config'
import { isQuantumSOLVersionSOL } from '../token/quantumSOL'
import { SOLMint } from '../token/wellknownToken.config'
import { fractionToDecimal } from '../txTools/decimal2Fraction'
import toFraction from '@/functions/numberish/toFraction'

export default function txCreateNewConcentratedPool() {
  return handleMultiTx(async ({ transactionCollector, baseUtils: { connection, owner, allTokenAccounts } }) => {
    const { coin1, coin2, userSelectedAmmConfigFeeOption, userSettedCurrentPrice } = useConcentrated.getState()
    assert(coin1, 'not set coin1')
    assert(coin2, 'not set coin2')
    assert(userSelectedAmmConfigFeeOption, 'not set userSelectedAmmConfigFeeOption')
    assert(userSettedCurrentPrice, 'not set userSettedCurrentPrice')
    const { transaction, signers, address } = await AmmV3.makeCreatePoolTransaction({
      connection: connection,
      programId: ammV3ProgramId,
      mint1: { mint: isQuantumSOLVersionSOL(coin1) ? SOLMint : coin1.mint, decimals: coin1.decimals },
      mint2: { mint: isQuantumSOLVersionSOL(coin2) ? SOLMint : coin2.mint, decimals: coin2.decimals },
      ammConfigId: toPub(userSelectedAmmConfigFeeOption.id),
      initialPrice: fractionToDecimal(toFraction(userSettedCurrentPrice)),
      owner
    })
    console.log('transaction, signers, address: ', transaction, signers, address)
    transactionCollector.add(await loadTransaction({ transaction: transaction, signers: signers }), {
      txHistoryInfo: {
        title: 'Create pool',
        description: `create new clmm pool`
      }
    })
  })
}
