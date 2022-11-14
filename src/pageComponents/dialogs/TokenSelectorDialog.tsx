import { useCallback, useDeferredValue, useMemo, useState } from 'react'

import { PublicKeyish } from '@raydium-io/raydium-sdk'

import useAppSettings from '@/application/common/useAppSettings'
import useNotification from '@/application/notification/useNotification'
import { getOnlineTokenInfo } from '@/application/token/getOnlineTokenInfo'
import {
  isQuantumSOL,
  isQuantumSOLVersionSOL,
  isQuantumSOLVersionWSOL,
  QuantumSOLVersionSOL
} from '@/application/token/quantumSOL'
import { SplToken } from '@/application/token/type'
import useToken, { SupportedTokenListSettingName } from '@/application/token/useToken'
import { createSplToken } from '@/application/token/useTokenListsLoader'
import { RAYMint, USDCMint, USDTMint } from '@/application/token/wellknownToken.config'
import useWallet from '@/application/wallet/useWallet'
import Button from '@/components/Button'
import Card from '@/components/Card'
import CoinAvatar from '@/components/CoinAvatar'
import Col from '@/components/Col'
import Icon from '@/components/Icon'
import Image from '@/components/Image'
import Input from '@/components/Input'
import InputBox from '@/components/InputBox'
import List from '@/components/List'
import ListFast from '@/components/ListFast'
import ResponsiveDialogDrawer from '@/components/ResponsiveDialogDrawer'
import Row from '@/components/Row'
import Switcher from '@/components/Switcher'
import { throttle } from '@/functions/debounce'
import toPubString from '@/functions/format/toMintString'
import { isMintEqual, isStringInsensitivelyEqual } from '@/functions/judgers/areEqual'
import useAsyncValue from '@/hooks/useAsyncValue'
import useToggle from '@/hooks/useToggle'

export type TokenSelectorProps = {
  open: boolean
  onClose?: () => void
  onSelectToken?: (token: SplToken) => unknown
  disableTokens?: (SplToken | PublicKeyish)[]
  enableTokens?: SplToken[]
  /**
   * if it select WSOL it can also select SOL, if it select SOL, can also select WSOL\
   * usually used with `disableTokens`
   */
  canSelectQuantumSOL?: boolean
}

export default function TokenSelectorDialog(props: TokenSelectorProps) {
  return (
    <ResponsiveDialogDrawer
      maskNoBlur
      transitionSpeed="fast"
      placement="from-top"
      open={props.open}
      onClose={props.onClose}
    >
      {({ close: closePanel }) => <TokenSelectorDialogContent {...props} onClose={closePanel} />}
    </ResponsiveDialogDrawer>
  )
}

function TokenSelectorDialogContent({
  open,
  onClose: closePanel,
  onSelectToken,
  enableTokens,
  disableTokens,
  canSelectQuantumSOL
}: TokenSelectorProps) {
  const tokenListSettings = useToken((s) => s.tokenListSettings)
  const getToken = useToken((s) => s.getToken)

  const isMobile = useAppSettings((s) => s.isMobile)
  const balances = useWallet((s) => s.balances)

  const [searchText, setSearchText] = useState('')
  const logWarning = throttle(useNotification.getState().logWarning)

  // used for if panel is not tokenList but tokenlistList
  const [currentTabIsTokenList, { off, on }] = useToggle()

  const closeAndClean = useCallback(() => {
    setSearchText('')
    closePanel?.()
  }, [])

  function isTokenDisabled(candidateToken: SplToken): boolean {
    if (enableTokens) return !enableTokens.some((token) => token.mint.equals(candidateToken.mint))
    return disableTokens
      ? disableTokens.some((disableToken) => {
          if (canSelectQuantumSOL && isQuantumSOL(disableToken)) {
            if (isQuantumSOLVersionSOL(disableToken) && isQuantumSOLVersionSOL(candidateToken)) return true
            if (isQuantumSOLVersionWSOL(disableToken) && isQuantumSOLVersionWSOL(candidateToken)) return true
            return false
          }
          return isMintEqual(disableToken, candidateToken)
        })
      : false
  }

  const allSelectableTokens = useToken((s) => s.allSelectableTokens)
  const sourceTokens = enableTokens || allSelectableTokens
  const sortedTokens = disableTokens?.length ? sourceTokens.filter((token) => !isTokenDisabled(token)) : sourceTokens

  // by user's search text
  const originalSearchedTokens = useMemo(
    () =>
      searchText
        ? firstFullMatched(
            sortedTokens.filter((token) =>
              searchText
                .split(' ')
                .every(
                  (keyWord) =>
                    toPubString(token.id).startsWith(keyWord) ||
                    new RegExp(`^.*${keyWord.toLowerCase()}.*$`).test(token.symbol?.toLowerCase() ?? '')
                )
            ),
            searchText
          )
        : sortedTokens,
    [searchText, sortedTokens, balances]
  )
  const searchedTokens = useDeferredValue(originalSearchedTokens)

  function firstFullMatched(tokens: SplToken[], searchText: string): SplToken[] {
    const fullMatched = tokens.filter((token) => token.symbol?.toLowerCase() === searchText.toLowerCase())
    return [
      ...fullMatched,
      ...tokens.filter(
        (t) =>
          !fullMatched.some(
            (f) =>
              isMintEqual(f.mint, t.mint) &&
              isStringInsensitivelyEqual(
                f.symbol,
                t.symbol
              ) /* check mint and symbol to avoid QuantumSOL(sol and wsol has same mint) */
          )
      )
    ]
  }

  // flag for can start user add mode
  const haveSearchResult = searchedTokens.length > 0
  const onlineTokenMintInfo = useAsyncValue(
    !haveSearchResult && searchText ? getOnlineTokenInfo(searchText) : undefined,
    undefined,
    [searchText, haveSearchResult]
  )

  // some keyboard (arrow up/down / mouse hover) will change the selected index
  const [selectedTokenIdx, setSelectedTokenIdx] = useState(0)

  const [userCustomizedTokenInfo, setUserCustomizedTokenInfo] = useState({
    symbol: '',
    name: ''
  })

  const cachedTokenList = useMemo(
    // cache for react useDeferredValue
    // "If you want to prevent a child component from re-rendering during an urgent update, you must also memoize that component with React.memo or React.useMemo:" ---- React official doc
    () => (
      <ListFast
        className="flex-grow flex flex-col px-4 mobile:px-2 mx-2 gap-2 overflow-auto my-2"
        sourceData={searchedTokens}
        getKey={(token, idx) => (isQuantumSOL(token) ? token.symbol : toPubString(token?.mint)) ?? idx}
        renderItem={(token, idx) => (
          <div>
            <Row
              className={`${
                selectedTokenIdx === idx
                  ? 'clickable no-clicable-transform-effect clickable-mask-offset-2 before:bg-[rgba(0,0,0,0.2)]'
                  : ''
              }`}
              onHoverChange={({ is: hoverStatus }) => {
                if (hoverStatus === 'start') {
                  setSelectedTokenIdx(idx)
                }
              }}
            >
              <TokenSelectorDialogTokenItem
                onClick={() => {
                  closeAndClean()
                  onSelectToken?.(token)
                }}
                token={token}
              />
            </Row>
          </div>
        )}
      />
    ),
    [searchedTokens, selectedTokenIdx, onSelectToken, closeAndClean, setSelectedTokenIdx]
  )
  const connected = useWallet((s) => s.connected)

  const recordUserAddedToken = (info: { symbol: string; name: string }): void => {
    if (!info.symbol) return
    const { addUserAddedToken } = useToken.getState()
    const decimals = onlineTokenMintInfo?.decimals
    if (!onlineTokenMintInfo || decimals === undefined) {
      logWarning(`the mint address is invalid`)
      return
    }
    const newToken = createSplToken({
      mint: searchText,
      symbol: info.symbol.slice(0, 8),
      decimals,
      icon: '',
      extensions: {},
      name: info.name ? info.name.slice(0, 16) : info.symbol.slice(0, 8),
      userAdded: true
    })
    addUserAddedToken(newToken)
  }
  return (
    <Card
      className="flex flex-col rounded-3xl mobile:rounded-none w-[min(468px,100vw)] mobile:w-full h-[min(680px,100vh)] mobile:h-screen border-1.5 border-[rgba(99,130,202,0.2)] bg-cyberpunk-card-bg shadow-cyberpunk-card"
      size="lg"
      htmlProps={{
        onKeyDown: (e) => {
          if (e.key === 'ArrowUp') {
            setSelectedTokenIdx((s) => Math.max(s - 1, 0))
          } else if (e.key === 'ArrowDown') {
            setSelectedTokenIdx((s) => Math.min(s + 1, searchedTokens.length - 1))
          } else if (e.key === 'Enter') {
            onSelectToken?.(searchedTokens[selectedTokenIdx])
            setTimeout(() => {
              closeAndClean()
            }, 200) // delay: give user some time to reflect the change
          }
        }
      }}
    >
      {currentTabIsTokenList ? (
        <div className="px-8 mobile:px-6 pt-6 pb-5">
          <Row className="justify-between items-center mb-6">
            <Icon
              className="text-[#ABC4FF] cursor-pointer clickable clickable-mask-offset-2"
              heroIconName="chevron-left"
              onClick={off}
            />
            <div className="text-xl font-semibold text-white">Token List Settings</div>
            <div></div>
          </Row>
          <List className="p-2 grid mt-2 overflow-auto max-h-[70vh]">
            {Object.entries(tokenListSettings)
              .map(([name]) => name as SupportedTokenListSettingName)
              .map((availableTokenListName) => (
                <List.Item key={availableTokenListName}>
                  <TokenSelectorDialogTokenListItem tokenListName={availableTokenListName} />
                </List.Item>
              ))}
          </List>
        </div>
      ) : (
        <>
          <div className="px-8 mobile:px-6 pt-6 pb-5">
            <Row className="justify-between items-center mb-6">
              <div className="text-xl font-semibold text-white">Select a token</div>
              <Icon
                className="text-[#ABC4FF] cursor-pointer clickable clickable-mask-offset-2"
                heroIconName="x"
                onClick={closeAndClean}
              />
            </Row>

            <Input
              value={searchText}
              placeholder="Search name or mint address"
              onUserInput={(text) => {
                setSearchText(text)
                setSelectedTokenIdx(0)
              }}
              className="py-3 px-4 rounded-xl bg-[#141041]"
              inputClassName="placeholder-[rgba(196,214,255,0.5)] text-sm text-[#ABC4FF]"
              labelText="input for searching coins"
              suffix={<Icon heroIconName="search" size="sm" className="text-[#C4D6FF]" />}
            />

            <div className="text-xs font-medium text-[rgba(171,196,255,.5)] my-3">Popular tokens</div>

            <Row className="justify-between">
              {([RAYMint, QuantumSOLVersionSOL, USDTMint, USDCMint] as const).map((mintish, idx) => {
                const token = isQuantumSOL(mintish) ? QuantumSOLVersionSOL : getToken(mintish)
                return (
                  <Row
                    key={toPubString(isQuantumSOL(mintish) ? mintish.mint : mintish)}
                    className={`gap-1 py-1 px-2 mobile:py-1.5 mobile:px-2.5 rounded ring-1 ring-inset ring-[rgba(171,196,255,.3)] items-center flex-wrap ${
                      token?.mint && isTokenDisabled(token) ? 'not-clickable' : 'clickable clickable-filter-effect'
                    }`}
                    onClick={() => {
                      if (token && isTokenDisabled(token)) return
                      closeAndClean()
                      if (token && onSelectToken) onSelectToken(token)
                    }}
                  >
                    <CoinAvatar size={isMobile ? 'xs' : 'sm'} token={token} />
                    <div className="text-base mobile:text-sm font-normal text-[#ABC4FF]">{token?.symbol ?? '--'}</div>
                  </Row>
                )
              })}
            </Row>
          </div>

          <div className="mobile:mx-6 border-t-1.5 border-[rgba(171,196,255,0.2)]"></div>

          <Col className="flex-1 overflow-hidden border-b-1.5 py-3 border-[rgba(171,196,255,0.2)]">
            <Row className="px-8 mobile:px-6 justify-between">
              <div className="text-xs font-medium text-[rgba(171,196,255,.5)]">Token</div>
              <Row className="text-xs font-medium text-[rgba(171,196,255,.5)] items-center gap-1">Balance</Row>
            </Row>
            {haveSearchResult ? (
              cachedTokenList
            ) : onlineTokenMintInfo ? (
              <Col className="p-8  gap-4">
                <InputBox
                  label="input a symbol for this token"
                  onUserInput={(e) => {
                    setUserCustomizedTokenInfo((prev) => ({ ...prev, symbol: e }))
                  }}
                />
                <InputBox
                  label="input a name for this token (optional)"
                  onUserInput={(e) => {
                    setUserCustomizedTokenInfo((prev) => ({ ...prev, name: e }))
                  }}
                />
                <Button
                  className="frosted-glass-teal"
                  onClick={() => {
                    recordUserAddedToken(userCustomizedTokenInfo)
                  }}
                  validators={[
                    {
                      should: connected,
                      forceActive: true,
                      fallbackProps: {
                        onClick: () => useAppSettings.setState({ isWalletSelectorShown: true }),
                        children: 'Connect Wallet'
                      }
                    },
                    { should: userCustomizedTokenInfo.symbol }
                  ]}
                >
                  Add User Token
                </Button>
              </Col>
            ) : null}
          </Col>

          <Button type="text" className="w-full py-4 rounded-none font-bold text-xs text-[#ABC4FF]" onClick={on}>
            View Token List
          </Button>
        </>
      )}
    </Card>
  )
}

function TokenSelectorDialogTokenItem({ token, onClick }: { token: SplToken; onClick?(): void }) {
  const [showUpdateCustomSymbol, setShowUpdateCustomSymbol] = useState(false)

  const userFlaggedTokenMints = useToken((s) => s.userFlaggedTokenMints)
  const canFlaggedTokenMints = useToken((s) => s.canFlaggedTokenMints)
  const userAddedTokens = useToken((s) => s.userAddedTokens)
  const isUserAddedToken = Boolean(userAddedTokens[toPubString(token.mint)])
  const toggleFlaggedToken = useToken((s) => s.toggleFlaggedToken)
  const deleteUserAddedToken = useToken((s) => s.deleteUserAddedToken)
  const editUserAddedToken = useToken((s) => s.editUserAddedToken)
  const getBalance = useWallet((s) => s.getBalance)
  const connected = useWallet((s) => s.connected)
  const userCustomTokenSymbol = useToken((s) => s.userCustomTokenSymbol)
  const updateUserCustomTokenSymbol = useToken((s) => s.updateUserCustomTokenSymbol)
  const isCustomTokenSymbolName = Boolean(userCustomTokenSymbol[toPubString(token.mint)])

  const [showUpdateInfo, setShowUpdateInfo] = useState(false)
  const [userCustomizedTokenInfo, setUserCustomizedTokenInfo] = useState({
    symbol: token.symbol || '',
    name: token.name || ''
  })

  return (
    <div className="group w-full">
      <Row onClick={onClick} className="group w-full gap-4 justify-between items-center p-2 ">
        <Row>
          <CoinAvatar token={token} className="mr-2" />
          <Col className="mr-2">
            <div className="text-base  max-w-[7em] overflow-hidden text-ellipsis  font-normal text-[#ABC4FF]">
              {token.symbol}
            </div>
            <div className="text-xs  max-w-[12em] overflow-hidden text-ellipsis whitespace-nowrap  font-medium text-[rgba(171,196,255,.5)]">
              {token.name}
            </div>
          </Col>
          {canFlaggedTokenMints.has(toPubString(token.mint)) ? (
            <div
              onClick={(ev) => {
                toggleFlaggedToken(token)
                ev.stopPropagation()
              }}
              className="group-hover:visible invisible inline-block text-sm mobile:text-xs text-[rgba(57,208,216,1)]  p-2 "
            >
              {userFlaggedTokenMints.has(toPubString(token.mint)) ? '[Remove Token]' : '[Add Token]'}
            </div>
          ) : null}
          {isUserAddedToken && !canFlaggedTokenMints.has(toPubString(token.mint)) ? (
            <>
              <div
                onClick={(ev) => {
                  deleteUserAddedToken(token)
                  ev.stopPropagation()
                }}
                className="group-hover:visible invisible inline-block text-sm mobile:text-xs text-[rgba(57,208,216,1)]  p-2 "
              >
                [Delete Token]
              </div>
              <div
                onClick={(ev) => {
                  setShowUpdateInfo((p) => !p)
                  ev.stopPropagation()
                }}
                className="group-hover:visible invisible inline-block text-sm mobile:text-xs text-[rgba(57,208,216,1)]  p-2 "
              >
                [Edit Token]
              </div>
            </>
          ) : null}
          {isCustomTokenSymbolName ? (
            <div
              onClick={(ev) => {
                setShowUpdateCustomSymbol((p) => !p)
                ev.stopPropagation()
              }}
              className="group-hover:visible invisible inline-block text-sm mobile:text-xs text-[rgba(57,208,216,1)]  p-2 "
            >
              [Edit Token]
            </div>
          ) : null}
        </Row>
        <div className="text-sm text-[#ABC4FF] justify-self-end">{getBalance(token)?.toExact?.()}</div>
      </Row>
      {showUpdateInfo && (
        <Col className="p-1  gap-4">
          <InputBox
            value={userCustomizedTokenInfo.symbol}
            label="input a symbol for this token"
            onUserInput={(e) => {
              setUserCustomizedTokenInfo((prev) => ({ ...prev, symbol: e }))
            }}
          />
          <InputBox
            value={userCustomizedTokenInfo.name}
            label="input a name for this token (optional)"
            onUserInput={(e) => {
              setUserCustomizedTokenInfo((prev) => ({ ...prev, name: e }))
            }}
          />
          <Button
            className="frosted-glass-teal"
            onClick={() => {
              editUserAddedToken(userCustomizedTokenInfo, token.mint)
              setShowUpdateInfo(false)
            }}
            validators={[
              {
                should: connected,
                forceActive: true,
                fallbackProps: {
                  onClick: () => useAppSettings.setState({ isWalletSelectorShown: true }),
                  children: 'Connect Wallet'
                }
              },
              { should: userCustomizedTokenInfo.symbol }
            ]}
          >
            Confirm
          </Button>
        </Col>
      )}
      {showUpdateCustomSymbol && (
        <Col className="p-1  gap-4">
          <InputBox
            value={userCustomizedTokenInfo.symbol}
            label="input a symbol for this token"
            onUserInput={(e) => {
              setUserCustomizedTokenInfo((prev) => ({ ...prev, symbol: e }))
            }}
          />
          <InputBox
            value={userCustomizedTokenInfo.name}
            label="input a name for this token (optional)"
            onUserInput={(e) => {
              setUserCustomizedTokenInfo((prev) => ({ ...prev, name: e }))
            }}
          />
          <Button
            className="frosted-glass-teal"
            onClick={() => {
              updateUserCustomTokenSymbol(token, userCustomizedTokenInfo.symbol, userCustomizedTokenInfo.name)
              setShowUpdateCustomSymbol(false)
            }}
            validators={[{ should: userCustomizedTokenInfo.symbol }]}
          >
            Confirm
          </Button>
        </Col>
      )}
    </div>
  )
}

function TokenSelectorDialogTokenListItem({ tokenListName }: { tokenListName: SupportedTokenListSettingName }) {
  const tokenListSettings = useToken((s) => s.tokenListSettings)
  const tokenList = tokenListSettings[tokenListName]
  const isOn = tokenListSettings[tokenListName].isOn
  const disableUserConfig = tokenListSettings[tokenListName].disableUserConfig
  const toggleTokenListName = () => {
    useToken.setState((s) => ({
      tokenListSettings: {
        ...s.tokenListSettings,
        [tokenListName]: {
          ...s.tokenListSettings[tokenListName],
          isOn: !s.tokenListSettings[tokenListName].isOn
        }
      }
    }))
  }
  if (!tokenList.mints?.size) return null
  if (tokenList.cannotbBeSeen) return null
  return (
    <Row className="my-4 items-center">
      {tokenList?.icon && <Image className="rounded-full h-8 w-8 overflow-hidden" src={tokenList.icon} />}

      <Col>
        <div className="text-base font-normal text-[#ABC4FF]">{tokenListName}</div>
        {tokenList && (
          <div className="text-sm font-medium text-[rgba(171,196,255,.5)]">{tokenList.mints?.size ?? '--'} tokens</div>
        )}
      </Col>

      <Switcher disable={disableUserConfig} className="ml-auto" defaultChecked={isOn} onToggle={toggleTokenListName} />
    </Row>
  )
}
