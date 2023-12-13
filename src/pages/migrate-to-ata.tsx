import useAppSettings from '@/application/common/useAppSettings'
import { useFarmFavoriteIds } from '@/application/farms/useFarms'
import txMigrateToATA from '@/application/migrateToATA/txMigrateToATA'
import { SplToken } from '@/application/token/type'
import useToken from '@/application/token/useToken'
import { ITokenAccount } from '@/application/wallet/type'
import useWallet from '@/application/wallet/useWallet'
import { AddressItem } from '@/components/AddressItem'
import Button from '@/components/Button'
import { Checkbox } from '@/components/Checkbox'
import CoinAvatar from '@/components/CoinAvatar'
import Col from '@/components/Col'
import Grid from '@/components/Grid'
import PageLayout from '@/components/PageLayout'
import toPubString from '@/functions/format/toMintString'
import { useEffect, useMemo, useState } from 'react'

/**
 * temporary migrate-to-ata page
 */
export default function MigrateToATAPage() {
  return (
    <PageLayout mobileBarTitle="Migrate ATA" metaTitle="Migrate ATA - Raydium" contentButtonPaddingShorter>
      <div className="title text-2xl mobile:text-lg font-semibold justify-self-start text-white mb-4">
        Migrate to ATA Token
      </div>
      <MigrateATAInputCard />
    </PageLayout>
  )
}

/** collect toke into  */
function collectTokenAccountsToJSMapByMintKey(allTokenAccounts: ITokenAccount[]) {
  const result = new Map<string /* mint string */, ITokenAccount[]>()
  const tokenMintKey = (account: ITokenAccount) => toPubString(account.mint) ?? 'native'
  for (const account of allTokenAccounts) {
    if (!result.has(tokenMintKey(account))) {
      result.set(tokenMintKey(account), [])
    }
    const jsSet = result.get(tokenMintKey(account))!
    jsSet.push(account)
  }
  return result
}

/** provide data of non-ata(associated token address) */
function useNonATATokens() {
  const allTokenAccounts = useWallet((s) => s.allTokenAccounts)
  const getToken = useToken((s) => s.getToken)
  type NonATAInfo = {
    token: SplToken
    tokenAccount: ITokenAccount
    ataToken?: SplToken
    ataTokenAccount?: ITokenAccount
  }

  const nonATA: Map<string /* token account address */, NonATAInfo> = useMemo(() => {
    const resultMap = new Map<string, NonATAInfo>()
    const allTokenAccountMapByMints = collectTokenAccountsToJSMapByMintKey(allTokenAccounts)
    for (const tokenAccount of allTokenAccounts) {
      if (!tokenAccount.isAssociated && !tokenAccount.isNative) {
        const token = getToken(tokenAccount.mint)
        if (!token) continue
        const ataTokenAccount = allTokenAccountMapByMints
          .get(toPubString(tokenAccount.mint))
          ?.find((a) => a.isAssociated)
        const ataToken = getToken(ataTokenAccount?.mint)
        resultMap.set(toPubString(tokenAccount.publicKey), {
          token,
          tokenAccount,
          ataToken,
          ataTokenAccount
        })
      }
    }
    return resultMap
  }, [allTokenAccounts])
  return nonATA
}

function MigrateATAInputCard() {
  const isApprovePanelShown = useAppSettings((s) => s.isApprovePanelShown)
  const walletConnected = useWallet((s) => s.connected)
  const toRealSymbol = useToken((s) => s.toRealSymbol)
  const nonATATokens = useNonATATokens()
  const gridClassName = 'grid-cols-[.2fr,1fr,1.8fr,1.4fr]'

  const allTokenAccounts = useWallet((s) => s.allTokenAccounts)
  const [migrateKeys, setMigrateKeys] = useState<string /* Account PublicKey */[]>([])
  // reset when accounts number changed
  useEffect(() => {
    setMigrateKeys([])
  }, [allTokenAccounts.length])
  const canMigrate = migrateKeys.length > 0
  return (
    <Col className="gap-8 mx-auto w-[min(800px,100%)]">
      <div>
        <Grid className={`${gridClassName} gap-2`}>
          {/* select check box */}
          <div></div>
          <div>token</div>
          <div>mint</div>
          <div>account</div>
        </Grid>
      </div>
      {nonATATokens.size > 0
        ? [...nonATATokens.entries()].map(([address, { token, tokenAccount, ataToken, ataTokenAccount }]) => (
            <div key={address}>
              <Grid className={`${gridClassName} items-center`}>
                <div>
                  <Checkbox
                    defaultChecked={migrateKeys.includes(address)}
                    onChange={(checked) => {
                      if (checked) {
                        setMigrateKeys((keys) => [...keys, address])
                      } else {
                        setMigrateKeys((keys) => keys.filter((k) => k !== address))
                      }
                    }}
                  ></Checkbox>
                </div>
                <div>
                  <CoinAvatar token={token} size="md" />
                  <div>{toRealSymbol(token)}</div>
                </div>
                <div>
                  <AddressItem textClassName="text-lg text-[#fff]" showDigitCount={8} canCopy>
                    {tokenAccount.mint}
                  </AddressItem>
                </div>
                <div>
                  <AddressItem textClassName="text-lg text-[#fff]" showDigitCount={8} canCopy>
                    {tokenAccount.publicKey}
                  </AddressItem>
                </div>
              </Grid>
            </div>
          ))
        : null}

      <Button
        size="lg"
        className="w-full frosted-glass-teal mt-5"
        isLoading={isApprovePanelShown}
        validators={[
          {
            should: walletConnected,
            forceActive: true,
            fallbackProps: {
              onClick: () => useAppSettings.setState({ isWalletSelectorShown: true }),
              children: 'Connect Wallet'
            }
          },
          {
            should: canMigrate,
            fallbackProps: { children: 'select need migrate tokens' }
          }
        ]}
        onClick={() => {
          txMigrateToATA(migrateKeys)
        }}
      >
        Migrate selected accounts
      </Button>
    </Col>
  )
}
