import { TokenAmount } from '@raydium-io/raydium-sdk'

import useConnection from '@/application/connection/useConnection'
import { QuantumSOL, toQuantumSolAmount, WSOL, WSOLMint } from '@/application/token/utils/quantumSOL'
import listToMap from '@/functions/format/listToMap'
import { objectMap, objectShakeNil } from '@/functions/objectMethods'
import useAsyncEffect from '@/hooks/useAsyncEffect'

import useToken from '../../token/useToken'
import { ITokenAccount } from '../type'
import useWallet from '../useWallet'
import { isMintEqual } from '@/functions/judgers/areEqual'
import { add } from '@/functions/numberish/operations'
import { Numberish } from '@/types/constants'
import { toString } from '@/functions/numberish/toString'
import toPubString from '@/functions/format/toMintString'
import { toTokenAmount } from '@/functions/format/toTokenAmount'
import toBN from '@/functions/numberish/toBN'

/** it is base on tokenAccounts, so when tokenAccounts refresh, balance will auto refresh */
export default function useInitBalanceRefresher() {
  const tokenAccounts = useWallet((s) => s.tokenAccounts)
  const allTokenAccounts = useWallet((s) => s.allTokenAccounts) // to get wsol balance
  const verboseTokenAccounts = useWallet((s) => s.verboseTokenAccounts)
  const getPureToken = useToken((s) => s.getPureToken)
  const connection = useConnection((s) => s.connection)
  const owner = useWallet((s) => s.owner)

  useAsyncEffect(async () => {
    if (!connection || !owner) {
      useWallet.setState({
        solBalance: undefined,
        balances: {},
        rawBalances: {},
        pureBalances: {},
        pureRawBalances: {}
      })
      return
    }

    // from tokenAccount to tokenAmount
    function toPureBalance(tokenAccount: ITokenAccount) {
      const tokenInfo = getPureToken(tokenAccount.mint)
      // console.log('tokenAccount: ', tokenAccount)
      if (!tokenInfo) return undefined
      return new TokenAmount(tokenInfo, tokenAccount.amount)
    }

    // currently WSOL show all balance(it a spectial hatch)
    // !it is in BN
    const allWsolBalance = allTokenAccounts.some((t) => isMintEqual(t.mint, WSOLMint))
      ? toBN(
          allTokenAccounts.reduce(
            (acc, t) => (isMintEqual(t.mint, WSOLMint) ? add(acc, t.amount) : acc),
            0 as Numberish
          )
        )
      : undefined

    // use TokenAmount (no QuantumSOL)
    const pureBalances = objectShakeNil({
      ...listToMap(
        tokenAccounts,
        (tokenAccount) => String(tokenAccount.mint),
        (tokenAccount) => toPureBalance(tokenAccount)
      ),
      [toPubString(WSOLMint)]: toTokenAmount(WSOL, allWsolBalance)
    })

    // use BN (no QuantumSOL)
    const pureRawBalances = objectMap(pureBalances, (balance) => balance.raw)

    // native sol balance (for QuantumSOL)
    const solBalance = verboseTokenAccounts.find((ta) => ta.isNative)?.amount

    // wsol balance (for QuantumSOL)
    const wsolBalance = tokenAccounts.find((ta) => String(ta.mint) === String(WSOLMint))?.amount

    // QuantumSOL balance
    const quantumSOLBalance = toQuantumSolAmount({ solRawAmount: solBalance, wsolRawAmount: wsolBalance })

    // use TokenAmount (QuantumSOL)
    const balances = { ...pureBalances, [String(QuantumSOL.mint)]: quantumSOLBalance }

    // use BN (QuantumSOL)
    const rawBalances = objectMap(balances, (balance) => balance.raw)

    useWallet.setState({
      solBalance,
      allWsolBalance,
      balances,
      rawBalances,
      pureBalances,
      pureRawBalances
    })
  }, [connection, tokenAccounts, verboseTokenAccounts, getPureToken, owner])
}
