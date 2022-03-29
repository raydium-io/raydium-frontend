import React, { useCallback, useMemo, useRef, useState } from 'react'

import { SPL_MINT_LAYOUT } from '@raydium-io/raydium-sdk'
import { PublicKey } from '@solana/web3.js'

import useAppSettings from '@/application/appSettings/useAppSettings'
import useConnection from '@/application/connection/useConnection'
import { SplToken } from '@/application/token/type'
import useToken, { SupportedTokenListSettingName } from '@/application/token/useToken'
import { isQuantumSOL, QuantumSOLVersionSOL } from '@/application/token/utils/quantumSOL'
import { RAYMint, USDCMint, USDTMint } from '@/application/token/utils/wellknownToken.config'
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
import ResponsiveDialogDrawer from '@/components/ResponsiveDialogDrawer'
import Row from '@/components/Row'
import Switcher from '@/components/Switcher'
import toPubString from '@/functions/format/toMintString'
import useAsyncValue from '@/hooks/useAsyncValue'
import useToggle from '@/hooks/useToggle'
import { createSplToken } from '@/application/token/feature/useTokenListsLoader'
import ListFast from '../ListFast'

export default function TokenSelectorDialog(props: Parameters<typeof TokenSelectorDialogContent>[0]) {
  return (
    <ResponsiveDialogDrawer
      maskNoBlur
      transitionSpeed="fast"
      placement="from-top"
      open={props.open}
      onClose={props.close}
    >
      {({ close: closePanel }) => <TokenSelectorDialogContent {...props} close={closePanel} />}
    </ResponsiveDialogDrawer>
  )
}

function TokenSelectorDialogContent({
  open,
  close: closePanel,
  onSelectCoin
}: {
  open: boolean
  close: () => void
  onSelectCoin?: (token: SplToken) => unknown
}) {
  const tokenListSettings = useToken((s) => s.tokenListSettings)
  const getToken = useToken((s) => s.getToken)

  const isMobile = useAppSettings((s) => s.isMobile)
  const balances = useWallet((s) => s.balances)

  const [searchText, setSearchText] = useState('')

  // used for if panel is not tokenList but tokenlistList
  const [currentTabIsTokenList, { off, on }] = useToggle()

  const closeAndClean = useCallback(() => {
    setSearchText('')
    closePanel?.()
  }, [])

  const sortedTokens = useToken((s) => s.allSelectableTokens)

  // by user's search text
  const searchedTokens = useMemo(
    () =>
      searchText
        ? firstFullMatched(
            sortedTokens.filter((token) =>
              searchText
                .split(' ')
                .every(
                  (keyWord) =>
                    toPubString(token.mint).startsWith(keyWord) ||
                    new RegExp(`^.*${keyWord.toLowerCase()}.*$`).test(token.symbol?.toLowerCase() ?? '')
                )
            ),
            searchText
          )
        : sortedTokens,
    [searchText, sortedTokens, balances]
  )
  function firstFullMatched(tokens: SplToken[], searchText: string): SplToken[] {
    const fullMatched = tokens.filter((token) => token.symbol?.toLowerCase() === searchText.toLowerCase())
    const fullMatchedMint = fullMatched.map((m) => toPubString(m.mint))
    return [...fullMatched, ...tokens.filter(({ mint }) => !fullMatchedMint.includes(toPubString(mint)))]
  }

  // flag for can start user add mode
  const haveSearchResult = useMemo(() => searchedTokens.length > 0, [searchedTokens])

  async function getOnlineTokenInfo(mint: string) {
    try {
      const { connection } = useConnection.getState()
      if (!connection) return false
      const tokenAccount = await connection.getAccountInfo(new PublicKey(mint))
      if (!tokenAccount) return false
      if (tokenAccount.data.length !== SPL_MINT_LAYOUT.span) return false
      return SPL_MINT_LAYOUT.decode(tokenAccount.data)
    } catch {
      return false
    }
  }
  const onlineTokenMintInfo = useAsyncValue(async () => {
    if (!haveSearchResult && searchText) {
      const result = await getOnlineTokenInfo(searchText)
      return result
    }
    return false
  }, false)

  // some keyboard (arrow up/down / mouse hover) will change the selected index
  const [selectedTokenIdx, setSelectedTokenIdx] = useState(0)

  const userCustomizedTokenSymbol = useRef('')

  return (
    <Card
      className="flex flex-col shadow-xl rounded-3xl mobile:rounded-none w-[min(468px,100vw)] mobile:w-full h-[min(680px,100vh)] mobile:h-screen border-1.5 border-[rgba(99,130,202,0.2)] bg-cyberpunk-card-bg"
      size="lg"
      style={{
        boxShadow: '0px 8px 48px rgba(171, 196, 255, 0.12)'
      }}
      htmlProps={{
        onKeyDown: (e) => {
          if (e.key === 'ArrowUp') {
            setSelectedTokenIdx((s) => Math.max(s - 1, 0))
          } else if (e.key === 'ArrowDown') {
            setSelectedTokenIdx((s) => Math.min(s + 1, searchedTokens.length - 1))
          } else if (e.key === 'Enter') {
            onSelectCoin?.(searchedTokens[selectedTokenIdx])
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
            <Icon
              className="text-[#ABC4FF] cursor-pointer clickable clickable-mask-offset-2"
              heroIconName="x"
              onClick={closeAndClean}
            />
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
                    className="gap-1 py-1 px-2 mobile:py-1.5 mobile:px-2.5 rounded ring-1 ring-inset ring-[rgba(171,196,255,.3)] items-center flex-wrap clickable clickable-filter-effect"
                    onClick={() => {
                      closeAndClean()
                      if (token && onSelectCoin) onSelectCoin(token)
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
                          onSelectCoin?.(token)
                        }}
                        token={token}
                      />
                    </Row>
                  </div>
                )}
              />
            ) : onlineTokenMintInfo ? (
              <Col className="p-8  gap-4">
                <InputBox
                  label="input a name for this token"
                  onUserInput={(text) => {
                    userCustomizedTokenSymbol.current = text
                  }}
                  onEnter={(text) => {
                    const { addUserAddedToken } = useToken.getState()
                    addUserAddedToken(
                      createSplToken({
                        mint: searchText,
                        symbol: text,
                        decimals: onlineTokenMintInfo.decimals,
                        icon: '',
                        extensions: {},
                        name: text
                      })
                    )
                  }}
                />
                <Button
                  className="frosted-glass-teal"
                  onClick={() => {
                    const { addUserAddedToken } = useToken.getState()
                    addUserAddedToken(
                      createSplToken({
                        mint: searchText,
                        symbol: userCustomizedTokenSymbol.current,
                        decimals: onlineTokenMintInfo.decimals,
                        icon: '',
                        extensions: {},
                        name: userCustomizedTokenSymbol.current
                      })
                    )
                  }}
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
  const userFlaggedTokenMints = useToken((s) => s.userFlaggedTokenMints)
  const canFlaggedTokenMints = useToken((s) => s.canFlaggedTokenMints)
  const toggleFlaggedToken = useToken((s) => s.toggleFlaggedToken)
  const getBalance = useWallet((s) => s.getBalance)
  return (
    <Row onClick={onClick} className="group w-full gap-4 justify-between items-center p-2 ">
      <Row>
        <CoinAvatar token={token} className="mr-2" />
        <Col className="mr-2">
          <div className="text-base font-normal text-[#ABC4FF]">{token.symbol}</div>
          <div className="text-xs font-medium text-[rgba(171,196,255,.5)]">{token.name}</div>
        </Col>
        {canFlaggedTokenMints.has(toPubString(token.mint)) ? (
          userFlaggedTokenMints.has(toPubString(token.mint)) ? (
            // <Icon
            //   iconSrc="/icons/misc-star-filled.svg"
            //   onClick={(ev) => {
            //     toggleFlaggedToken(token)
            //     ev.nativeEvent.stopPropagation()
            //     ev.nativeEvent.preventDefault()
            //   }}
            //   className="text-base clickable p-2"
            // />
            <div
              onClick={(ev) => {
                toggleFlaggedToken(token)
                ev.stopPropagation()
              }}
              className="group-hover:visible invisible inline-block text-sm mobile:text-xs text-[rgba(57,208,216,1)]  p-2 "
            >
              [Remove Token]
            </div>
          ) : (
            // <Icon
            //   iconSrc="/icons/misc-star-empty.svg"
            //   onClick={(ev) => {
            //     toggleFlaggedToken(token)
            //     ev.nativeEvent.stopPropagation()
            //     ev.nativeEvent.preventDefault()
            //   }}
            //   className="group-hover:visible pc:invisible mobile:visible clickable p-2"
            // />
            <div
              onClick={(ev) => {
                toggleFlaggedToken(token)
                ev.stopPropagation()
              }}
              className="group-hover:visible invisible text-sm mobile:text-xs text-[rgba(57,208,216,1)]  p-2"
            >
              [Add Token]
            </div>
          )
        ) : null}
      </Row>
      <div className="text-sm text-[#ABC4FF] justify-self-end">{getBalance(token)?.toExact?.()}</div>
    </Row>
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
