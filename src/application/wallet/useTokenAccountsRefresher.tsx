import { useEffect, useRef } from 'react'

import { Connection, PublicKey } from '@solana/web3.js'

import useConnection from '@/application/connection/useConnection'

import { getWalletTokenAccounts } from './getWalletTokenAccounts'
import useWallet from './useWallet'

import useFarms from '@/application/farms/useFarms'
import useLiquidity from '@/application/liquidity/useLiquidity'
import { usePools } from '@/application/pools/usePools'
import { useSwap } from '@/application/swap/useSwap'
import { shakeFalsyItem } from '@/functions/arrayMethods'
import { listToJSMap } from '@/functions/format/listToMap'
import toPubString from '@/functions/format/toMintString'
import { makeAbortable } from '@/functions/makeAbortable'
import { eq } from '@/functions/numberish/compare'
import useConcentrated from '../concentrated/useConcentrated'
import { addWalletAccountChangeListener, removeWalletAccountChangeListener } from './useWalletAccountChangeListeners'

/** update token accounts will cause balance refresh */
export default function useTokenAccountsRefresher(): void {
  const connection = useConnection((s) => s.connection)
  const owner = useWallet((s) => s.owner)

  const walletRefreshCount = useWallet((s) => s.refreshCount)
  const swapRefreshCount = useSwap((s) => s.refreshCount)
  const liquidityRefreshCount = useLiquidity((s) => s.refreshCount)
  const farmRefreshCount = useFarms((s) => s.farmRefreshCount)
  const poolRefreshCount = usePools((s) => s.refreshCount)
  const concentratedRefreshCount = useConcentrated((s) => s.refreshCount)

  const walletIntervalTag = useWallet((s) => s.walletIntervalTag)

  useEffect(() => {
    if (!connection || !owner) return
    const listenerId = addWalletAccountChangeListener(() => {
      loadTokenAccounts(connection, owner)
    })
    loadTokenAccounts(connection, owner)
    return () => removeWalletAccountChangeListener(listenerId)
  }, [connection, owner])

  useEffect(() => {
    if (!connection || !owner) return
    const intervalId = window.setInterval(() => {
      loadTokenAccounts(connection, owner)
    }, 1000 * 60 * 2)

    return () => clearInterval(intervalId)
  }, [connection, owner, walletIntervalTag])

  // useEffect(() => {
  //   if (!connection || !owner) return
  //   let abort: () => void
  //   let stopPrevListener: () => void
  //   const timerId = setTimeout(() => {
  //     const { abort: abortTask } = makeAbortable((canContinue) => {
  //       const promiseResult = loadTokenAccounts(connection, owner, canContinue, { noSecondTry: true })
  //       promiseResult.then((result) => {
  //         if (result) {
  //           stopPrevListener = result.clear
  //         }
  //       })
  //     })
  //     abort = abortTask
  //   }, 100)
  //   return () => {
  //     clearTimeout(timerId)
  //     abort?.()
  //     stopPrevListener?.()
  //   }
  // }, [
  //   connection,
  //   owner,
  //   walletRefreshCount,
  //   swapRefreshCount,
  //   liquidityRefreshCount,
  //   farmRefreshCount,
  //   poolRefreshCount,
  //   concentratedRefreshCount
  // ])
}

/** if all tokenAccount amount is not changed (which may happen in 'confirmed'), auto fetch second time in 'finalized'*/
const loadTokenAccounts = async (
  connection: Connection,
  owner: PublicKey,
  canContinue: () => boolean = () => true,
  options?: { noSecondTry?: boolean }
) => {
  const { allTokenAccounts, tokenAccountRawInfos, tokenAccounts, nativeTokenAccount } =
    await getRichWalletTokenAccounts({ connection, owner })
  if (!canContinue()) return
  //#region ------------------- diff -------------------
  const pastTokenAccounts = listToJSMap(
    useWallet.getState().allTokenAccounts,
    (a) => toPubString(a.publicKey) ?? 'native'
  )
  const newTokenAccounts = listToJSMap(allTokenAccounts, (a) => toPubString(a.publicKey) ?? 'native')
  const diffAccounts = shakeFalsyItem(
    [...newTokenAccounts].filter(([accountPub, { amount: newAmount }]) => {
      const pastAmount = pastTokenAccounts.get(accountPub)?.amount
      return !eq(newAmount, pastAmount)
    })
  )
  const diffCount = diffAccounts.length
  const hasWalletTokenAccountChanged = diffCount >= 2
  //#endregion

  if (options?.noSecondTry || hasWalletTokenAccountChanged || diffCount === 0) {
    useWallet.setState({
      tokenAccountsOwner: owner,
      tokenAccountRawInfos,
      nativeTokenAccount,
      tokenAccounts,
      allTokenAccounts
    })
  } else {
    // try in 'finalized'
    const listenerId = addWalletAccountChangeListener(
      async () => {
        const { allTokenAccounts, tokenAccountRawInfos, tokenAccounts, nativeTokenAccount } =
          await getRichWalletTokenAccounts({ connection, owner })
        useWallet.setState({
          tokenAccountsOwner: owner,
          tokenAccountRawInfos,
          nativeTokenAccount,
          tokenAccounts,
          allTokenAccounts
        })
      },
      {
        once: true,
        lifetime: 'finalized'
      }
    )
    return { clear: () => removeWalletAccountChangeListener(listenerId) }
  }
}

/**  rich info of {@link getWalletTokenAccounts}'s return  */
export async function getRichWalletTokenAccounts(...params: Parameters<typeof getWalletTokenAccounts>) {
  const { accounts: allTokenAccounts, rawInfos } = await getWalletTokenAccounts(...params)
  return {
    tokenAccountRawInfos: rawInfos,
    nativeTokenAccount: allTokenAccounts.find((ta) => ta.isNative),
    tokenAccounts: allTokenAccounts.filter((ta) => ta.isAssociated),
    allTokenAccounts: allTokenAccounts
  }
}
