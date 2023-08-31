import { Farm, TokenAmount } from '@raydium-io/raydium-sdk'

import txHandler, { lookupTableCache } from '@/application/txTools/handleTx'
import {
  addWalletAccountChangeListener, removeWalletAccountChangeListener
} from '@/application/wallet/useWalletAccountChangeListeners'
import assert from '@/functions/assert'

import { jsonInfo2PoolKeys } from '../txTools/jsonInfo2PoolKeys'
import useWallet from '../wallet/useWallet'

import { HydratedFarmInfo } from './type'
import useFarms from './useFarms'

export default async function txFarmDeposit(
  info: HydratedFarmInfo,
  options: { isStaking?: boolean; amount: TokenAmount }
) {
  return txHandler(async ({ transactionCollector, baseUtils: { owner, connection } }) => {
    // const piecesCollector = createTransactionCollector()
    assert(owner, 'require connected wallet')

    const jsonFarmInfo = useFarms.getState().jsonInfos.find(({ id }) => String(id) === String(info.id))
    assert(jsonFarmInfo, 'Farm pool not found')

    // ------------- add farm deposit transaction --------------
    const poolKeys = jsonInfo2PoolKeys(jsonFarmInfo)

    // ------------- add deposit transaction --------------
    const { tokenAccountRawInfos, txVersion } = useWallet.getState()
    const { innerTransactions } = await Farm.makeDepositInstructionSimple({
      connection,
      poolKeys,
      fetchPoolInfo: info.fetchedMultiInfo,
      ownerInfo: {
        feePayer: owner,
        wallet: owner,
        tokenAccounts: tokenAccountRawInfos
      },

      lookupTableCache,
      makeTxVersion: txVersion,
      amount: options.amount.raw,
      checkCreateATAOwner: true
    })

    const listenerId = addWalletAccountChangeListener(
      () => {
        useFarms.getState().refreshFarmInfos()
      },
      { once: true }
    )
    transactionCollector.add(innerTransactions, {
      onTxError: () => removeWalletAccountChangeListener(listenerId),
      onTxSentError: () => removeWalletAccountChangeListener(listenerId),
      txHistoryInfo: {
        title: `Add ${options.amount.token.symbol}`,
        description: `Stake ${options.amount.toExact()} ${options.amount.token.symbol}`
      }
    })
  })
}
