import { Farm, InnerTransaction, TokenAmount } from '@raydium-io/raydium-sdk'

import txHandler from '@/application/txTools/handleTx'
import {
  addWalletAccountChangeListener,
  removeWalletAccountChangeListener
} from '@/application/wallet/useWalletAccountChangeListeners'
import assert from '@/functions/assert'

import { jsonInfo2PoolKeys } from '../txTools/jsonInfo2PoolKeys'

import toBN from '@/functions/numberish/toBN'
import useWallet from '../wallet/useWallet'
import { HydratedFarmInfo } from './type'
import useFarms from './useFarms'

export default async function txFarmHarvest(
  info: HydratedFarmInfo,
  options: { isStaking?: boolean; rewardAmounts: TokenAmount[] }
) {
  return txHandler(async ({ transactionCollector, baseUtils: { owner, connection } }) => {
    const innerTransactions: InnerTransaction[] = []
    assert(owner, 'require connected wallet')

    const jsonFarmInfo = useFarms.getState().jsonInfos.find(({ id }) => String(id) === String(info.id))
    assert(jsonFarmInfo, 'Farm pool not found')

    // ------------- add farm deposit transaction --------------
    const poolKeys = jsonInfo2PoolKeys(jsonFarmInfo)
    const ledgerAddress = Farm.getAssociatedLedgerAccount({
      programId: poolKeys.programId,
      poolId: poolKeys.id,
      owner,
      version: poolKeys.version as 6 | 5 | 3
    })

    // ------------- create ledger --------------
    if (!info.ledger && jsonFarmInfo.version < 6 /* start from v6, no need init ledger any more */) {
      const { innerTransaction } = Farm.makeCreateAssociatedLedgerAccountInstruction({
        poolKeys,
        userKeys: { owner, ledger: ledgerAddress }
      })
      innerTransactions.push(innerTransaction)
    }

    // ------------- add withdraw transaction --------------
    const { tokenAccountRawInfos } = useWallet.getState()
    const { innerTransactions: makeInstructions } = await Farm.makeWithdrawInstructionSimple({
      connection,
      fetchPoolInfo: info.fetchedMultiInfo,
      ownerInfo: {
        feePayer: owner,
        wallet: owner,
        tokenAccounts: tokenAccountRawInfos
      },
      amount: toBN(0),
      checkCreateATAOwner: true
    })
    innerTransactions.push(...makeInstructions)

    const listenerId = addWalletAccountChangeListener(
      () => {
        useFarms.getState().refreshFarmInfos()
      },
      { once: true }
    )
    transactionCollector.add(innerTransactions, {
      onTxError: () => removeWalletAccountChangeListener(listenerId),
      onTxSentError: () => removeWalletAccountChangeListener(listenerId),
      onTxSuccess: () => {
        setTimeout(() => {
          useFarms.getState().refreshFarmInfos()
        }, 300) // sometimes pending rewards is not very reliable, so invoke it manually
      }, // wallet Account Change sometimes not stable
      txHistoryInfo: {
        title: `Harvest ${options.rewardAmounts.map(({ token }) => token.symbol).join(', ')}`,
        description: `Harvest ${options.rewardAmounts
          .map((amount) => `${amount.toExact()} ${amount.token.symbol}`)
          .join(', ')}`
      }
    })
  })
}
