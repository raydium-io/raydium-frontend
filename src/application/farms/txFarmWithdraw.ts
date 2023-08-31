import { Farm, TokenAmount } from '@raydium-io/raydium-sdk'

import { createTransactionCollector } from '@/application/txTools/createTransaction'
import txHandler, { lookupTableCache } from '@/application/txTools/handleTx'
import {
  addWalletAccountChangeListener, removeWalletAccountChangeListener
} from '@/application/wallet/useWalletAccountChangeListeners'
import assert from '@/functions/assert'

import useWallet from '../wallet/useWallet'

import { HydratedFarmInfo } from './type'
import useFarms from './useFarms'

export default async function txFarmWithdraw(
  info: HydratedFarmInfo,
  options: { isStaking?: boolean; amount: TokenAmount }
) {
  return txHandler(async ({ transactionCollector, baseUtils: { owner, connection } }) => {
    const piecesCollector = createTransactionCollector()
    assert(owner, 'require connected wallet')

    const jsonFarmInfo = useFarms.getState().jsonInfos.find(({ id }) => String(id) === String(info.id))
    assert(jsonFarmInfo, 'Farm pool not found')

    // ------------- add withdraw transaction --------------
    const { tokenAccountRawInfos, txVersion } = useWallet.getState()
    const depositInstruction = await Farm.makeWithdrawInstructionSimple({
      connection,
      fetchPoolInfo: info.fetchedMultiInfo,
      ownerInfo: {
        feePayer: owner,
        wallet: owner,
        tokenAccounts: tokenAccountRawInfos
      },
      amount: options.amount.raw,
      checkCreateATAOwner: true,
      makeTxVersion: txVersion,
      lookupTableCache
    })
    piecesCollector.addInnerTransactions(...depositInstruction.innerTransactions)

    const listenerId = addWalletAccountChangeListener(
      () => {
        useFarms.getState().refreshFarmInfos()
      },
      { once: true }
    )
    transactionCollector.add(piecesCollector.spawnTransactionQueue(), {
      onTxError: () => removeWalletAccountChangeListener(listenerId),
      onTxSentError: () => removeWalletAccountChangeListener(listenerId),
      txHistoryInfo: {
        title: `Unstake ${options.amount.token.symbol}`,
        description: `Unstake ${options.amount.toExact()} ${options.amount.token.symbol}`
      }
    })
  })
}
