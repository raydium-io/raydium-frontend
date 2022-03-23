import { useEffect } from 'react'

import { Connection, PublicKey } from '@solana/web3.js'

import useConnection from '@/application/connection/useConnection'

import useWallet from '../useWallet'
import { getWalletTokenAccounts } from '../utils/getWalletTokenAccounts'

import { addWalletAccountChangeListener, removeWalletAccountChangeListener } from './useWalletAccountChangeListeners'
import { ZERO } from '@raydium-io/raydium-sdk'
import { eq } from '@/functions/numberish/compare'
import { useSwap } from '@/application/swap/useSwap'
import useLiquidity from '@/application/liquidity/useLiquidity'
import useFarms from '@/application/farms/useFarms'
import { usePools } from '@/application/pools/usePools'
import { listToJSMap } from '@/functions/format/listToMap'
import toPubString from '@/functions/format/toMintString'
import { shakeFalsyItem } from '@/functions/arrayMethods'

/** update token accounts will cause balance refresh */
export default function useTokenAccountsRefresher(): void {
  const connection = useConnection((s) => s.connection)
  const owner = useWallet((s) => s.owner)

  const walletRefreshCount = useWallet((s) => s.refreshCount)
  const swapRefreshCount = useSwap((s) => s.refreshCount)
  const liquidityRefreshCount = useLiquidity((s) => s.refreshCount)
  // both farms pages and stake pages
  const farmRefreshCount = useFarms((s) => s.farmRefreshCount)
  const poolRefreshCount = usePools((s) => s.refreshCount)

  useEffect(() => {
    if (!connection || !owner) return
    const listenerId = addWalletAccountChangeListener(() => fetchTokenAccounts(connection, owner))
    return () => removeWalletAccountChangeListener(listenerId)
  }, [connection, owner])

  useEffect(() => {
    if (!connection || !owner) return
    fetchTokenAccounts(connection, owner, { noSecondTry: true })
  }, [walletRefreshCount, swapRefreshCount, liquidityRefreshCount, farmRefreshCount, poolRefreshCount])
}

/** if all tokenAccount amount is not changed (which may happen in 'confirmed'), auto fetch second time in 'finalized'*/
const fetchTokenAccounts = async (connection: Connection, owner: PublicKey, options?: { noSecondTry?: boolean }) => {
  const { accounts: allTokenAccounts, rawInfos } = await getWalletTokenAccounts({
    connection,
    owner: new PublicKey(owner),
    config: {
      commitment: 'confirmed'
    }
  })

  //#region ------------------- diff -------------------
  const pastTokenAccounts = listToJSMap(
    useWallet.getState().allTokenAccounts,
    (a) => toPubString(a.publicKey) ?? 'native'
  )
  const newTokenAccounts = listToJSMap(allTokenAccounts, (a) => toPubString(a.publicKey) ?? 'native')
  const diffAccounts = shakeFalsyItem(
    [...newTokenAccounts].filter(([accountPub, { amount: newAmount }]) => {
      const pastAmount = pastTokenAccounts.get(accountPub)?.amount ?? ZERO
      return !eq(newAmount, pastAmount)
    })
  )
  const diffCount = diffAccounts.length
  const hasWalletTokenAccountChanged = diffCount >= 2
  //#endregion

  if (options?.noSecondTry || hasWalletTokenAccountChanged) {
    useWallet.setState({
      tokenAccountRawInfos: rawInfos,
      verboseTokenAccounts: allTokenAccounts.filter((ta) => ta.isAssociated || ta.isNative),
      tokenAccounts: allTokenAccounts.filter((ta) => ta.isAssociated),
      allTokenAccounts: allTokenAccounts
    })
  } else {
    // try in 'finalized'
    const { accounts: allTokenAccounts, rawInfos } = await getWalletTokenAccounts({
      connection,
      owner: new PublicKey(owner),
      config: {
        commitment: 'finalized'
      }
    })
    useWallet.setState({
      tokenAccountRawInfos: rawInfos,
      verboseTokenAccounts: allTokenAccounts.filter((ta) => ta.isAssociated || ta.isNative),
      tokenAccounts: allTokenAccounts.filter((ta) => ta.isAssociated),
      allTokenAccounts: allTokenAccounts
    })
  }
}
