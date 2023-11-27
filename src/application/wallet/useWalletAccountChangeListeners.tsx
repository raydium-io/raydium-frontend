import { useEffect } from 'react'

import { PublicKey, KeyedAccountInfo } from '@solana/web3.js'
import { TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { SPL_ACCOUNT_LAYOUT, Spl } from '@raydium-io/raydium-sdk'

import useConnection from '@/application/connection/useConnection'

import useWallet from './useWallet'
import { ITokenAccount } from './type'
import toBN from '@/functions/numberish/toBN'
import { throttle } from '@/functions/debounce'

type WalletAccountChangeListener = () => void

type ListenerId = number

type InnerWalletAccountChangeListenerSettings = {
  lifetime: 'confirmed' | 'finalized'
  listenerId: ListenerId
  cb: WalletAccountChangeListener
  once?: boolean
}

let walletAccountChangeListeners: InnerWalletAccountChangeListenerSettings[] = []
let listenerIdCounter = 1

export const updateAccountInfoData: {
  tokenAccounts: Map<string, KeyedAccountInfo>
  nativeAccount?: ITokenAccount
} = {
  tokenAccounts: new Map()
}

// if invoke frequently, batch call after 3 seconds
const throttleInvoke = throttle(() => invokeWalletAccountChangeListeners('confirmed'), { delay: 3000 })

// if update frequently, batch update after 1 seconds
const throttleUpdate = throttle(
  () => {
    const { allTokenAccounts, tokenAccountRawInfos, tokenAccounts, owner } = useWallet.getState()
    if (!owner) return

    if (updateAccountInfoData.tokenAccounts.size) {
      const readyUpdateDataMap: Map<string, ITokenAccount> = Array.from(
        updateAccountInfoData.tokenAccounts.entries()
      ).reduce((acc, cur) => {
        const rawResult = SPL_ACCOUNT_LAYOUT.decode(cur[1].accountInfo.data)
        const { mint, amount, owner } = rawResult
        const associatedTokenAddress = Spl.getAssociatedTokenAccount({
          mint,
          owner,
          programId: cur[1].accountId
        })
        const pubkey = cur[1].accountId

        const updateTokenAccount: ITokenAccount = {
          publicKey: pubkey,
          mint,
          isAssociated: associatedTokenAddress.equals(pubkey),
          amount,
          isNative: false
        }
        acc.set(cur[0].toString(), updateTokenAccount)
        return new Map(Array.from(acc.entries()))
      }, new Map())

      allTokenAccounts.forEach((tokenAcc, idx) => {
        if (tokenAcc.mint && tokenAcc.publicKey) {
          allTokenAccounts[idx] = readyUpdateDataMap.get(tokenAcc.publicKey.toString()) || allTokenAccounts[idx]
        }
        if (tokenAcc.isNative && updateAccountInfoData.nativeAccount) {
          allTokenAccounts[idx] = updateAccountInfoData.nativeAccount
        }
      })

      tokenAccounts.forEach((tokenAcc, idx) => {
        if (tokenAcc.mint && tokenAcc.publicKey) {
          tokenAccounts[idx] = readyUpdateDataMap.get(tokenAcc.publicKey.toString()) || allTokenAccounts[idx]
        }
      })

      tokenAccountRawInfos.forEach((tokenAcc, idx) => {
        const updateData = updateAccountInfoData.tokenAccounts.get(tokenAcc.pubkey.toString())
        if (tokenAcc.accountInfo.mint && tokenAcc.programId && updateData) {
          tokenAccountRawInfos[idx] = {
            pubkey: updateData.accountId,
            accountInfo: SPL_ACCOUNT_LAYOUT.decode(updateData.accountInfo.data),
            programId: readyUpdateDataMap.get(updateData.accountId.toString())!.programId!
          }
        }
      })

      useWallet.setState({
        allTokenAccounts: [...allTokenAccounts],
        tokenAccounts: [...tokenAccounts],
        tokenAccountRawInfos: [...tokenAccountRawInfos],
        nativeTokenAccount: updateAccountInfoData.nativeAccount || useWallet.getState().nativeTokenAccount
      })
    } else if (updateAccountInfoData.nativeAccount) {
      allTokenAccounts.forEach((tokenAcc, idx) => {
        if (tokenAcc.isNative && updateAccountInfoData.nativeAccount) {
          allTokenAccounts[idx] = updateAccountInfoData.nativeAccount
        }
      })
      useWallet.setState({
        allTokenAccounts: [...allTokenAccounts],
        nativeTokenAccount: updateAccountInfoData.nativeAccount
      })
    }
    throttleInvoke()
  },
  { delay: 1000 }
)

export function useWalletAccountChangeListeners() {
  const connection = useConnection((s) => s.connection)
  const owner = useWallet((s) => s.owner)
  useEffect(() => {
    if (!connection || !owner) return
    const listenerId = connection.onAccountChange(
      new PublicKey(owner),
      (info) => {
        const solTokenAcc: ITokenAccount = {
          amount: toBN(String(info.lamports ?? 0)),
          isNative: true
        }

        updateAccountInfoData.nativeAccount = solTokenAcc
        throttleUpdate()
      },
      'confirmed'
    )

    const tokenProgramSubId = connection.onProgramAccountChange(
      TOKEN_PROGRAM_ID,
      (info) => {
        updateAccountInfoData.tokenAccounts.set(info.accountId.toString(), info)
        throttleUpdate()
      },
      'confirmed',
      [
        { dataSize: SPL_ACCOUNT_LAYOUT.span },
        {
          memcmp: {
            offset: 32, // number of bytes
            bytes: owner.toBase58() // base58 encoded string
          }
        }
      ]
    )

    // const listenerId2 = connection.onAccountChange(
    //   new PublicKey(owner),
    //   () => {
    //     invokeWalletAccountChangeListeners('finalized')
    //   },
    //   'finalized'
    // )

    return () => {
      connection.removeAccountChangeListener(listenerId)
      // connection.removeAccountChangeListener(listenerId2)
      connection.removeProgramAccountChangeListener(tokenProgramSubId)
    }
  }, [connection, owner])
}

// TODO: the code form  of use this is not straightforward, should be integrated in handleMultiTx
export function addWalletAccountChangeListener(
  cb: () => void,
  options?: {
    /** default is 'confirmed' */
    lifetime?: 'confirmed' | 'finalized'
    once?: boolean
  }
): ListenerId {
  const listenerId = listenerIdCounter
  listenerIdCounter += 1
  walletAccountChangeListeners.push({
    lifetime: options?.lifetime ?? 'confirmed',
    cb,
    once: options?.once,
    listenerId: listenerId
  })
  return listenerId
}

export function removeWalletAccountChangeListener(id: ListenerId) {
  const idx = walletAccountChangeListeners.findIndex((l) => l.listenerId === id)
  if (idx >= 0) {
    walletAccountChangeListeners.splice(idx, 1)
  }
}

// export function invokeWalletAccountChangeListeners(lifeTime: 'confirmed' | 'finalized') {
export function invokeWalletAccountChangeListeners(lifeTime: 'confirmed') {
  walletAccountChangeListeners.forEach((l) => l.cb())
  walletAccountChangeListeners = walletAccountChangeListeners.filter((l) => !(l.lifetime === lifeTime && l.once))
}
