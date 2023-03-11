import { Liquidity, Token } from '@raydium-io/raydium-sdk'
import { PublicKey } from '@solana/web3.js'

import { WSOLMint } from '@/application/token/quantumSOL'
import useToken from '@/application/token/useToken'
import txHandler from '@/application/txTools/handleTx'
import useWallet from '@/application/wallet/useWallet'
import assert from '@/functions/assert'
import toPubString, { toPub } from '@/functions/format/toMintString'
import { toTokenAmount } from '@/functions/format/toTokenAmount'
import { isValidPublicKey } from '@/functions/judgers/dateType'
import { gt, gte, isMeaningfulNumber } from '@/functions/numberish/compare'
import { getMax, mul } from '@/functions/numberish/operations'
import toBN from '@/functions/numberish/toBN'

import useAppAdvancedSettings from '../common/useAppAdvancedSettings'
import { getComputeBudgetConfig } from '../txTools/getComputeBudgetConfig'

import { getMaxBalanceBNIfNotATA } from '../token/getMaxBalanceIfNotATA'
import { recordCreatedPool } from './recordCreatedPool'
import useCreatePool from './useCreatePool'

export default async function txCreateAndInitNewPool({ onAllSuccess }: { onAllSuccess?: () => void }) {
  return txHandler(async ({ transactionCollector, baseUtils: { owner, connection } }) => {
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

    const { getToken } = useToken.getState()
    const { solBalance, tokenAccounts, pureRawBalances } = useWallet.getState()

    assert(lpMint, 'required create-pool step 1, it will cause info injection') // actually no need, but for type check , copy form other file
    assert(marketId, 'required create-pool step 1, it will cause info injection') // actually no need, but for type check , copy form other file
    assert(isValidPublicKey(marketId), 'required valid market id')
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
    const isAlreadyInited = Boolean(
      ammInfoOnChain?.length && isMeaningfulNumber(Liquidity.getStateLayout(4).decode(ammInfoOnChain)?.status)
    )
    assert(!isAlreadyInited, 'pool already inited')

    // assert user has eligible base and quote
    const { tokenAccountRawInfos } = useWallet.getState()

    const baseToken = getToken(baseMint) || new Token(baseMint, baseDecimals)
    const quoteToken = getToken(quoteMint) || new Token(quoteMint, quoteDecimals)

    assert(
      gte(
        toPubString(baseMint) === toPubString(WSOLMint)
          ? getMax(pureRawBalances[baseMint] ?? 0, solBalance ?? 0)
          : toTokenAmount(baseToken, getMaxBalanceBNIfNotATA(baseToken.mint)),
        toTokenAmount(baseToken, baseDecimaledAmount).raw // input amount
      ),
      "wallet haven't enough base token"
    )

    assert(
      gte(
        toPubString(quoteMint) === toPubString(WSOLMint)
          ? getMax(pureRawBalances[quoteMint] ?? 0, solBalance ?? 0)
          : toTokenAmount(quoteToken, getMaxBalanceBNIfNotATA(quoteToken.mint)),
        toTokenAmount(quoteToken, quoteDecimaledAmount).raw // input amount
      ),
      "wallet haven't enough quote token"
    )

    // step2: init new pool (inject money into the created pool)
    const { innerTransactions } = await Liquidity.makeCreatePoolV4InstructionV2Simple({
      connection,
      programId: useAppAdvancedSettings.getState().programIds.AmmV4,
      marketInfo: {
        programId: useAppAdvancedSettings.getState().programIds.OPENBOOK_MARKET,
        marketId: toPub(marketId)
      },
      associatedOnly: false,
      ownerInfo: {
        feePayer: owner,
        wallet: owner,
        tokenAccounts: tokenAccountRawInfos,
        useSOLBalance: true
      },
      baseMintInfo: {
        mint: toPub(baseMint),
        decimals: baseDecimals
      },
      quoteMintInfo: {
        mint: toPub(quoteMint),
        decimals: quoteDecimals
      },
      startTime: toBN((startTime ? startTime.getTime() : Date.now()) / 1000),
      baseAmount: toBN(mul(baseDecimaledAmount, 10 ** baseDecimals)),
      quoteAmount: toBN(mul(quoteDecimaledAmount, 10 ** quoteDecimals)),

      computeBudgetConfig: await getComputeBudgetConfig()
    })
    transactionCollector.add(innerTransactions, {
      onTxSuccess() {
        recordCreatedPool()
        useCreatePool.setState({ startTime: undefined })
      },
      txHistoryInfo: {
        title: 'Create Pool',
        description: `${baseDecimaledAmount} ${baseToken.symbol} and ${quoteDecimaledAmount} ${quoteToken.symbol}`
      }
    })
  }).then(({ allSuccess }) => {
    if (allSuccess) {
      onAllSuccess?.()
    }
  })
}
