import { Farm, TokenAmount } from '@raydium-io/raydium-sdk'

import { createTransactionCollector } from '@/application/txTools/createTransaction'
import txHandler from '@/application/txTools/handleTx'
import {
  addWalletAccountChangeListener,
  removeWalletAccountChangeListener
} from '@/application/wallet/useWalletAccountChangeListeners'
import assert from '@/functions/assert'

import { jsonInfo2PoolKeys } from '../txTools/jsonInfo2PoolKeys'

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

    // ------------- add farm deposit transaction --------------
    const poolKeys = jsonInfo2PoolKeys(jsonFarmInfo)
    const ledgerAddress = await Farm.getAssociatedLedgerAccount({
      programId: poolKeys.programId,
      poolId: poolKeys.id,
      owner,
      version: poolKeys.version as 6 | 5 | 3
    })

    // ------------- create ledger --------------
    if (!info.ledger && jsonFarmInfo.version < 6 /* start from v6, no need init ledger any more */) {
      const { innerTransaction } = await Farm.makeCreateAssociatedLedgerAccountInstruction({
        poolKeys,
        userKeys: { owner, ledger: ledgerAddress }
      })
      piecesCollector.addInnerTransactions(innerTransaction)
    }

    // ------------- add withdraw transaction --------------
    const { tokenAccountRawInfos } = useWallet.getState()
    const depositInstruction = Farm.makeWithdrawInstructionSimple({
      connection,
      fetchPoolInfo: info.fetchedMultiInfo,
      ownerInfo: {
        feePayer: owner,
        wallet: owner,
        tokenAccounts: tokenAccountRawInfos
      },
      amount: options.amount.raw
    })
    piecesCollector.addInnerTransactions(...(await depositInstruction).innerTransactions)

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
