import { useEffect, useMemo } from 'react'

import useWallet from '@/application/wallet/useWallet'
import toPubString from '@/functions/format/toMintString'

import useToken, { USER_ADDED_TOKEN_LIST_NAME } from './useToken'
import { mergeObjects } from '@/functions/mergeObjects'
import { SplToken } from './type'

/**
 * a feature hook
 * base on user's token list settings, load corresponding tokens
 */
export default function useAutoUpdateSelectableTokens() {
  const verboseTokens = useToken((s) => s.verboseTokens)
  const userAddedTokens = useToken((s) => s.userAddedTokens)
  const tokenListSettings = useToken((s) => s.tokenListSettings)
  const userFlaggedTokenMints = useToken((s) => s.userFlaggedTokenMints)
  const sortTokens = useToken((s) => s.sortTokensWithBalance)
  const balances = useWallet((s) => s.balances)

  // only user opened token list
  const settingsFiltedTokens = useMemo(() => {
    const activeTokenListNames = Object.entries(tokenListSettings)
      .filter(([, setting]) => setting.isOn)
      .map(([name]) => name)

    const havUserAddedTokens = activeTokenListNames.some(
      (tokenListName) => tokenListName === USER_ADDED_TOKEN_LIST_NAME
    )

    const verboseTokensMints = verboseTokens.map((t) => toPubString(t.mint))
    const filteredUserAddedTokens = (havUserAddedTokens ? Object.values(userAddedTokens) : []).filter(
      (i) => !verboseTokensMints.includes(toPubString(i.mint))
    )

    const filteredTokens: SplToken[] = []
    for (const token of verboseTokens.concat(filteredUserAddedTokens)) {
      const isUserFlagged =
        tokenListSettings[USER_ADDED_TOKEN_LIST_NAME] && userFlaggedTokenMints.has(toPubString(token.mint))
      if (!isUserFlagged) {
        const isOnByTokenList = activeTokenListNames.some((tokenListName) =>
          tokenListSettings[tokenListName]?.mints?.has(toPubString(token.mint))
        )
        if (!isOnByTokenList) continue
      }

      const userAddedToken = userAddedTokens[token.mintString]
      if (userAddedToken) {
        const newToken = mergeObjects(token, {
          symbol: userAddedToken.symbol,
          name: userAddedToken.name ?? userAddedToken.symbol
        })
        filteredTokens.push(newToken)
      } else {
        filteredTokens.push(token)
      }
    }
    return filteredTokens
  }, [verboseTokens, userAddedTokens, tokenListSettings, userAddedTokens])

  // have sorted
  const sortedTokens = useMemo(
    () => sortTokens(settingsFiltedTokens),
    [settingsFiltedTokens, sortTokens, balances, verboseTokens.length]
  )

  useEffect(() => {
    useToken.setState({
      allSelectableTokens: sortedTokens
    })
  }, [sortedTokens])
}
