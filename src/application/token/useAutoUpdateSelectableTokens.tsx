import useWallet from '@/application/wallet/useWallet'
import { mergeObjects, mergeSets } from '@/functions/mergeObjects'
import { useEffect, useMemo } from 'react'
import { SplToken } from './type'
import useToken, { USER_ADDED_TOKEN_LIST_NAME } from './useToken'

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
    const activeTokensMints = mergeSets(
      ...activeTokenListNames.map((tokenListName) => tokenListSettings[tokenListName]?.mints ?? new Set())
    ) as Set<string>

    const havUserAddedTokens = activeTokenListNames.includes(USER_ADDED_TOKEN_LIST_NAME)
    const verboseTokensMints = verboseTokens.map((t) => t.mintString)
    const filteredUserAddedTokens = (havUserAddedTokens ? Object.values(userAddedTokens) : []).filter(
      (i) => !verboseTokensMints.includes(i.mintString)
    )

    const filteredTokens: SplToken[] = []
    for (const token of verboseTokens.concat(filteredUserAddedTokens)) {
      const isUserFlagged = tokenListSettings[USER_ADDED_TOKEN_LIST_NAME] && userFlaggedTokenMints.has(token.mintString)
      if (!isUserFlagged) {
        const isOnByTokenList = activeTokensMints.has(token.mintString)

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
