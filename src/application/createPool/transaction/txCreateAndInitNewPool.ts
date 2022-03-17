import { Liquidity, Token, WSOL } from '@raydium-io/raydium-sdk'
import { PublicKey } from '@solana/web3.js'

import useToken from '@/application/token/useToken'
import { loadTransaction } from '@/application/txTools/createTransaction'
import handleMultiTx from '@/application/txTools/handleMultiTx'
import useWallet from '@/application/wallet/useWallet'
import assert from '@/functions/assert'
import { toTokenAmount } from '@/functions/format/toTokenAmount'
import { isMintEqual } from '@/functions/judgers/areEqual'
import { gt, gte, isMeaningfulNumber } from '@/functions/numberish/compare'
import toBN from '@/functions/numberish/toBN'

import useCreatePool from '../useCreatePool'
import { recordCreatedPool } from '../utils/recordCreatedPool'
import { deUITokenAmount, WSOLMint } from '@/application/token/utils/quantumSOL'
import toPubString from '@/functions/format/toMintString'
import { getMax } from '@/functions/numberish/operations'

export default async function txCreateAndInitNewPool({ onAllSuccess }: { onAllSuccess?: () => void }) {
  return handleMultiTx(async ({ transactionCollector, baseUtils: { owner, connection } }) => {
    // setTxHistoryInfo({ title: 'Create a new pool' })

    const {
      lpMint,
      marketId,
      ammId,
      baseMint,
      quoteMint,
      baseDecimals,
      quoteDecimals,
      baseDecimaledAmount,
      quoteDecimaledAmount,
      sdkAssociatedPoolKeys,
      startTime
    } = useCreatePool.getState()

    const { getPureToken } = useToken.getState()
    const { pureBalances, solBalance } = useWallet.getState()

    assert(lpMint, 'required create-pool step 1, it will cause info injection') // actually no need, but for type check , copy form other file
    assert(marketId, 'required create-pool step 1, it will cause info injection') // actually no need, but for type check , copy form other file
    assert(ammId, 'required create-pool step 1, it will cause info injection') // actually no need, but for type check , copy form other file
    assert(baseMint, 'required create-pool step 1, it will cause info injection') // actually no need, but for type check , copy form other file
    assert(quoteMint, 'required create-pool step 1, it will cause info injection') // actually no need, but for type check , copy form other file
    assert(baseDecimals != null, 'required create-pool step 1, it will cause info injection') // actually no need, but for type check , copy form other file
    assert(quoteDecimals != null, 'required create-pool step 1, it will cause info injection') // actually no need, but for type check , copy form other file
    assert(baseDecimaledAmount, 'required create-pool step 1, it will cause info injection') // actually no need, but for type check , copy form other file
    assert(quoteDecimaledAmount, 'required create-pool step 1, it will cause info injection') // actually no need, but for type check , copy form other file
    assert(gt(baseDecimaledAmount, 0), 'should input > 0 base amount ')
    assert(gt(quoteDecimaledAmount, 0), 'should input > 0 quote amount ')
    assert(sdkAssociatedPoolKeys, 'required create-pool step 1, it will cause info injection') // actually no need, but for type check , copy form other file

    const ammInfoOnChain = (await connection?.getAccountInfo(new PublicKey(ammId)))?.data
    const isAlreadyCreated = Boolean(ammInfoOnChain?.length)
    const isAlreadyInited = Boolean(
      ammInfoOnChain?.length && isMeaningfulNumber(Liquidity.getStateLayout(4).decode(ammInfoOnChain)?.status)
    )

    assert(!isAlreadyInited, 'pool already inited')

    // assert user has eligible base and quote
    const { tokenAccountRawInfos } = useWallet.getState()

    const baseToken = getPureToken(baseMint) || new Token(baseMint, baseDecimals)
    const quoteToken = getPureToken(quoteMint) || new Token(quoteMint, quoteDecimals)

    assert(
      gte(
        toPubString(baseMint) === toPubString(WSOLMint)
          ? getMax(pureBalances[baseMint], solBalance ?? 0)
          : pureBalances[baseMint],
        toTokenAmount(baseToken, baseDecimaledAmount)
      ),
      "wallet haven't enough base token"
    )

    assert(
      gte(
        toPubString(quoteMint) === toPubString(WSOLMint)
          ? getMax(pureBalances[quoteMint], solBalance ?? 0)
          : pureBalances[quoteMint],
        toTokenAmount(baseToken, baseDecimaledAmount)
      ),
      "wallet haven't enough quote token"
    )

    // eslint-disable-next-line no-console
    console.assert(!isAlreadyCreated, 'pool already created')

    if (!isAlreadyCreated) {
      // step1: create pool
      const { transaction: sdkTransaction1, signers: sdkSigners1 } = Liquidity.makeCreatePoolTransaction({
        poolKeys: sdkAssociatedPoolKeys,
        userKeys: { payer: owner }
      })

      transactionCollector.add(await loadTransaction({ transaction: sdkTransaction1, signers: sdkSigners1 }), {
        txHistoryInfo: {
          title: 'Create a new pool',
          description: `pool's ammId: ${ammId.slice(0, 4)}...${ammId.slice(-4)}`
        }
      })
    }

    // step2: init new pool (inject money into the created pool)
    const { transaction: sdkTransaction2, signers: sdkSigners2 } = await Liquidity.makeInitPoolTransaction({
      poolKeys: sdkAssociatedPoolKeys,
      startTime: startTime ? toBN(startTime.getTime() / 1000) : undefined,
      baseAmount: toTokenAmount(baseToken, baseDecimaledAmount, { alreadyDecimaled: true }),
      quoteAmount: toTokenAmount(quoteToken, quoteDecimaledAmount, { alreadyDecimaled: true }),
      connection,
      userKeys: { owner, payer: owner, tokenAccounts: tokenAccountRawInfos }
    })
    transactionCollector.add(await loadTransaction({ transaction: sdkTransaction2, signers: sdkSigners2 }), {
      onTxSuccess() {
        recordCreatedPool()
        useCreatePool.setState({ startTime: undefined })
      },
      txHistoryInfo: {
        title: 'Init pool',
        description: `${baseDecimaledAmount} ${baseToken.symbol} and ${quoteDecimaledAmount} ${quoteToken.symbol}`
      }
    })
  }).then(({ allSuccess }) => {
    if (allSuccess) {
      onAllSuccess?.()
    }
  })
}
