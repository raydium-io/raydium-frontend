import { Farm, TokenAmount } from '@raydium-io/raydium-sdk'

import createAssociatedTokenAccountIfNotExist from '@/application/txTools/createAssociatedTokenAccountIfNotExist'
import { createTransactionCollector } from '@/application/txTools/createTransaction'
import handleMultiTx from '@/application/txTools/handleMultiTx'
import {
  addWalletAccountChangeListener,
  removeWalletAccountChangeListener
} from '@/application/wallet/useWalletAccountChangeListeners'
import assert from '@/functions/assert'
import asyncMap from '@/functions/asyncMap'
import { jsonInfo2PoolKeys } from '../txTools/jsonInfo2PoolKeys'
import { HydratedFarmInfo } from './type'
import useFarms from './useFarms'

export default async function txFarmHarvest(
  info: HydratedFarmInfo,
  options: { isStaking?: boolean; rewardAmounts: TokenAmount[] }
) {
  return handleMultiTx(async ({ transactionCollector, baseUtils: { owner } }) => {
    const piecesCollector = createTransactionCollector()
    assert(owner, 'require connected wallet')

    const jsonFarmInfo = useFarms.getState().jsonInfos.find(({ id }) => String(id) === String(info.id))
    assert(jsonFarmInfo, 'Farm pool not found')

    // ------------- add lp token transaction --------------
    const lpTokenAccount = await createAssociatedTokenAccountIfNotExist({
      collector: piecesCollector,
      mint: info.lpMint
    })

    // ------------- add rewards token transaction --------------
    const rewardTokenAccountsPublicKeys = await asyncMap(jsonFarmInfo.rewardInfos, ({ rewardMint }) =>
      createAssociatedTokenAccountIfNotExist({
        collector: piecesCollector,
        mint: rewardMint,
        autoUnwrapWSOLToSOL: true
      })
    )

    // ------------- add farm deposit transaction --------------
    const poolKeys = jsonInfo2PoolKeys(jsonFarmInfo)
    const ledgerAddress = await Farm.getAssociatedLedgerAccount({
      programId: poolKeys.programId,
      poolId: poolKeys.id,
      owner
    })

    // ------------- create ledger --------------
    if (!info.ledger && jsonFarmInfo.version < 6 /* start from v6, no need init ledger any more */) {
      const instruction = await Farm.makeCreateAssociatedLedgerAccountInstruction({
        poolKeys,
        userKeys: { owner, ledger: ledgerAddress }
      })
      piecesCollector.addInstruction(instruction)
    }
    // ------------- add withdraw transaction --------------
    const depositInstruction = Farm.makeWithdrawInstruction({
      poolKeys,
      userKeys: {
        ledger: ledgerAddress,
        lpTokenAccount,
        owner,
        rewardTokenAccounts: rewardTokenAccountsPublicKeys
      },
      amount: 0
    })
    piecesCollector.addInstruction(depositInstruction)

    const listenerId = addWalletAccountChangeListener(
      () => {
        useFarms.getState().refreshFarmInfos()
      },
      { once: true }
    )
    transactionCollector.add(await piecesCollector.spawnTransaction(), {
      onTxError: () => removeWalletAccountChangeListener(listenerId),
      onTxSentError: () => removeWalletAccountChangeListener(listenerId),
      txHistoryInfo: {
        title: `Harvest ${options.rewardAmounts.map(({ token }) => token.symbol).join(' and ')}`,
        description: `Harvest ${options.rewardAmounts
          .map((amount) => `${amount.toExact()} ${amount.token.symbol}`)
          .join(' and ')}`
      }
    })
  })
}
