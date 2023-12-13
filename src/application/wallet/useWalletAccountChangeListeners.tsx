import { useEffect } from 'react'

import { PublicKey, KeyedAccountInfo } from '@solana/web3.js'
import { TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID } from '@solana/spl-token'
import { SPL_ACCOUNT_LAYOUT, Spl } from '@raydium-io/raydium-sdk'

import useConnection from '@/application/connection/useConnection'

import useWallet from './useWallet'
import { ITokenAccount } from './type'
import toBN from '@/functions/numberish/toBN'
import { throttle } from '@/functions/debounce'
import { WSOLMint } from '../token/quantumSOL'
import BN from 'bn.js'

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
  tokenAccounts: Map<
    string,
    {
      data: KeyedAccountInfo
      programId: PublicKey
    }
  >
  nativeAccount?: ITokenAccount
  deleteAccount: Set<string>
} = {
  tokenAccounts: new Map(),
  deleteAccount: new Set()
}

export const clearUpdateTokenAccountData = () => {
  updateAccountInfoData.nativeAccount = undefined
  updateAccountInfoData.deleteAccount.clear()
  updateAccountInfoData.tokenAccounts.clear()
}

// if update frequently, batch update after 1 seconds
const throttleUpdate = throttle(
  () => {
    const { allTokenAccounts, tokenAccountRawInfos, tokenAccounts, owner } = useWallet.getState()
    if (!owner) return
    if (updateAccountInfoData.tokenAccounts.size || updateAccountInfoData.deleteAccount.size) {
      const readyUpdateDataMap: Map<string, ITokenAccount> = Array.from(
        updateAccountInfoData.tokenAccounts.entries()
      ).reduce((acc, cur) => {
        const rawResult = SPL_ACCOUNT_LAYOUT.decode(cur[1].data.accountInfo.data)
        const { mint, amount, owner } = rawResult
        const associatedTokenAddress = Spl.getAssociatedTokenAccount({
          mint,
          owner,
          programId: cur[1].programId || TOKEN_PROGRAM_ID
        })
        const pubkey = cur[1].data.accountId
        const updateTokenAccount: ITokenAccount = {
          publicKey: pubkey,
          mint,
          isAssociated: associatedTokenAddress.equals(pubkey),
          amount,
          isNative: false,
          programId: cur[1].programId || TOKEN_PROGRAM_ID
        }
        acc.set(cur[0].toString(), updateTokenAccount)
        return new Map(Array.from(acc.entries()))
      }, new Map())
      const updatedSet = new Set()

      allTokenAccounts.forEach((tokenAcc, idx) => {
        if (tokenAcc.mint && tokenAcc.publicKey) {
          allTokenAccounts[idx] = readyUpdateDataMap.get(tokenAcc.publicKey.toString()) || allTokenAccounts[idx]
          updatedSet.add(tokenAcc.publicKey.toString())
        }
        if (updateAccountInfoData.deleteAccount.has(tokenAcc.publicKey?.toString() || '')) {
          allTokenAccounts[idx].amount = new BN(0)
        }
        if (tokenAcc.isNative && updateAccountInfoData.nativeAccount) {
          allTokenAccounts[idx] = updateAccountInfoData.nativeAccount
        }
      })

      // check new ata
      if (updatedSet.size !== readyUpdateDataMap.size) {
        const newAtaList = Array.from(readyUpdateDataMap.values()).filter(
          (tokenAcc) => !updatedSet.has(tokenAcc.publicKey?.toString())
        )
        if (newAtaList.length) newAtaList.forEach((data) => allTokenAccounts.push(data))
      }
      updatedSet.clear()

      tokenAccounts.forEach((tokenAcc, idx) => {
        if (tokenAcc.mint && tokenAcc.publicKey) {
          tokenAccounts[idx] = readyUpdateDataMap.get(tokenAcc.publicKey.toString()) || allTokenAccounts[idx]
          updatedSet.add(tokenAcc.publicKey.toString())
        }
        if (updateAccountInfoData.deleteAccount.has(tokenAcc.publicKey?.toString() || '')) {
          tokenAccounts[idx].amount = new BN(0)
        }
      })

      // check new ata
      if (updatedSet.size !== readyUpdateDataMap.size) {
        const newAtaList = Array.from(readyUpdateDataMap.values()).filter(
          (tokenAcc) => !updatedSet.has(tokenAcc.publicKey?.toString())
        )

        if (newAtaList.length) newAtaList.forEach((data) => tokenAccounts.push(data))
      }
      updatedSet.clear()

      tokenAccountRawInfos.forEach((tokenAcc, idx) => {
        const updateData = updateAccountInfoData.tokenAccounts.get(tokenAcc.pubkey.toString())
        if (tokenAcc.accountInfo.mint && tokenAcc.programId && updateData) {
          tokenAccountRawInfos[idx] = {
            pubkey: updateData.data.accountId,
            accountInfo: SPL_ACCOUNT_LAYOUT.decode(updateData.data.accountInfo.data),
            programId: readyUpdateDataMap.get(updateData.data.accountId.toString())!.programId!
          }
          if (updateAccountInfoData.deleteAccount.has(updateData.data.accountId.toString() || '')) {
            tokenAccountRawInfos[idx].accountInfo.amount = new BN(0)
          }
          updatedSet.add(tokenAcc.pubkey.toString())
        }
      })

      const newAtaList = Array.from(updateAccountInfoData.tokenAccounts.values()).filter(
        (tokenAcc) => !updatedSet.has(tokenAcc.data.accountId.toString())
      )

      // check new ata

      if (newAtaList.length)
        newAtaList.forEach((data) =>
          tokenAccountRawInfos.push({
            pubkey: data.data.accountId,
            accountInfo: SPL_ACCOUNT_LAYOUT.decode(data.data.accountInfo.data),
            programId: data.programId
          })
        )

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
    invokeWalletAccountChangeListeners('confirmed')
  },
  { delay: 3000 }
)

export function useWalletAccountChangeListeners() {
  const connection = useConnection((s) => s.connection)
  const owner = useWallet((s) => s.owner)
  const allTokenAccounts = useWallet((s) => s.allTokenAccounts)

  useEffect(() => {
    if (!connection || !owner) return

    const allWSolAcc = allTokenAccounts.filter((acc) => acc.mint?.equals(WSOLMint))
    const allClmmNftAcc = allTokenAccounts.filter((acc) => acc.amount.eq(new BN(1)))
    const allListenerId: number[] = []

    const allAcc = [...allWSolAcc, ...allClmmNftAcc]
    allAcc.forEach((acc) => {
      if (!acc.publicKey) return
      allListenerId.push(
        connection.onAccountChange(
          acc.publicKey,
          (info) => {
            const pub = acc.publicKey
            if (pub && info.lamports === 0) {
              updateAccountInfoData.deleteAccount.add(pub.toString())
              throttleUpdate()
            }
          },
          'confirmed'
        )
      )
    })

    return () => {
      allListenerId.forEach((id) => connection.removeAccountChangeListener(id))
    }
  }, [connection, owner, allTokenAccounts])

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
        updateAccountInfoData.tokenAccounts.set(info.accountId.toString(), {
          data: info,
          programId: TOKEN_PROGRAM_ID
        })
        updateAccountInfoData.deleteAccount.delete(info.accountId.toString())
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

    const token2022ProgramSubId = connection.onProgramAccountChange(
      TOKEN_2022_PROGRAM_ID,
      (info) => {
        updateAccountInfoData.tokenAccounts.set(info.accountId.toString(), {
          data: info,
          programId: TOKEN_2022_PROGRAM_ID
        })
        updateAccountInfoData.deleteAccount.delete(info.accountId.toString())
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
      connection.removeProgramAccountChangeListener(token2022ProgramSubId)
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
