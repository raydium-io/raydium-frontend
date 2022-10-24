import { PublicKey } from '@solana/web3.js'

import { Spl, TokenAmount } from 'test-r-sdk'

import { createTransactionCollector } from '@/application/txTools/createTransaction'
import txHandler, { SingleTxOptions, HandleFnOptions } from '@/application/txTools/handleTx'
import toPubString, { toPub } from '@/functions/format/toMintString'
import { toString } from '@/functions/numberish/toString'
import { PublicKeyish } from '@/types/constants'

import { getRichWalletTokenAccounts } from '../wallet/useTokenAccountsRefresher'

export default async function txTransferToken(
  options: {
    /** wallet address  */
    to: PublicKey // destination

    /** if un specify, just use self or forceKeyPairs*/
    /** wallet address  */
    from?: PublicKeyish // source

    tokenAmount: TokenAmount
  } & SingleTxOptions &
    HandleFnOptions
) {
  return txHandler(
    async ({ transactionCollector, baseUtils: { owner, connection, tokenAccounts } }) => {
      const from = toPub(options.from ?? options.forceKeyPairs?.ownerKeypair.publicKey ?? owner)
      const to = toPub(options.to)

      // const {tokenAccounts, allTokenAccounts} = await getRichWalletTokenAccounts({connection, owner:from})
      const tokenAccountsFrom = tokenAccounts
      const { tokenAccounts: tokenAccountsTo } = await getRichWalletTokenAccounts({ connection, owner: to })

      const tokenAccountFrom = tokenAccountsFrom.find(
        (tokenAccount) => toPubString(tokenAccount.mint) === toPubString(options.tokenAmount.token.mint)
      )
      const tokenAccountTo = tokenAccountsTo.find(
        (tokenAccount) => toPubString(tokenAccount.mint) === toPubString(options.tokenAmount.token.mint)
      )
      if (!tokenAccountFrom) {
        throw new Error(`no token account from ${toPubString(options.tokenAmount.token.mint)}`)
      }

      if (!tokenAccountTo) {
        throw new Error(`no token account to ${toPubString(options.tokenAmount.token.mint)}`)
      }

      const piecesCollection = createTransactionCollector()
      piecesCollection.addInstruction(
        Spl.makeTransferInstruction({
          source: tokenAccountFrom.publicKey!, // it's not navtive sol, so must have publicKey
          destination: tokenAccountTo.publicKey!,
          amount: options.tokenAmount.raw,
          owner: from
        })
      )
      transactionCollector.add(await piecesCollection.spawnTransaction(), {
        txHistoryInfo: {
          title: 'Token Transfer',
          description: `${toString(options.tokenAmount)} ${options.tokenAmount.token.symbol} from ${toPubString(
            from
          )} to ${toPubString(to)}`
        }
      })
    },
    { forceKeyPairs: options.forceKeyPairs }
  )
}
