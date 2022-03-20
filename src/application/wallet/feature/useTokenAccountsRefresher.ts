import { useEffect } from 'react'

import { Connection, PublicKey } from '@solana/web3.js'

import useConnection from '@/application/connection/useConnection'

import useWallet from '../useWallet'
import { getWalletTokenAccounts } from '../utils/getWalletTokenAccounts'

import { addWalletAccountChangeListener, removeWalletAccountChangeListener } from './useWalletAccountChangeListeners'

/** update token accounts will cause balance refresh */
export default function useTokenAccountsRefresher(): void {
  const connection = useConnection((s) => s.connection)
  const owner = useWallet((s) => s.owner)
  const connected = useWallet((s) => s.connected)

  useEffect(() => {
    if (!connection || !owner || !connected) return
    fetchTokenAccounts(connection, owner)
    const listenerId = addWalletAccountChangeListener(() => {
      fetchTokenAccounts(connection, owner)
    })
    return () => {
      removeWalletAccountChangeListener(listenerId)
    }
  }, [connection, owner, connected])
}

const fetchTokenAccounts = async (connection: Connection, owner: PublicKey) => {
  const { accounts: allTokenAccounts, rawInfos } = await getWalletTokenAccounts({
    connection,
    owner: new PublicKey(owner)
  })
  // eslint-disable-next-line no-console
  console.log('start to fecth balance')
  useWallet.setState({
    tokenAccountRawInfos: rawInfos,
    verboseTokenAccounts: allTokenAccounts.filter((ta) => ta.isAssociated || ta.isNative),
    tokenAccounts: allTokenAccounts.filter((ta) => ta.isAssociated),
    allTokenAccounts: allTokenAccounts
  })
}
