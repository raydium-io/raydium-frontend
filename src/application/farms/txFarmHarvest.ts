import { Farm, TokenAmount } from '@raydium-io/raydium-sdk'

import txHandler, { lookupTableCache } from '@/application/txTools/handleTx'
import {
  addWalletAccountChangeListener, removeWalletAccountChangeListener
} from '@/application/wallet/useWalletAccountChangeListeners'
import assert from '@/functions/assert'
import toBN from '@/functions/numberish/toBN'

import useWallet from '../wallet/useWallet'

import { HydratedFarmInfo } from './type'
import useFarms from './useFarms'

export default async function txFarmHarvest(
  info: HydratedFarmInfo,
  options: { isStaking?: boolean; rewardAmounts: TokenAmount[] }
) {
  return txHandler(async ({ transactionCollector, baseUtils: { owner, connection } }) => {
    assert(owner, 'require connected wallet')

    const jsonFarmInfo = useFarms.getState().jsonInfos.find(({ id }) => String(id) === String(info.id))
    assert(jsonFarmInfo, 'Farm pool not found')

    // ------------- add withdraw transaction --------------
    const { tokenAccountRawInfos, txVersion } = useWallet.getState()
    const { innerTransactions } = await Farm.makeWithdrawInstructionSimple({
      connection,
      fetchPoolInfo: info.fetchedMultiInfo,
      ownerInfo: {
        feePayer: owner,
        wallet: owner,
        tokenAccounts: tokenAccountRawInfos
      },
      amount: toBN(0),
      checkCreateATAOwner: true,
      makeTxVersion: txVersion,
      lookupTableCache
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
