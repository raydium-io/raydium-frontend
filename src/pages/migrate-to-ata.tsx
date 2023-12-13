import useAppSettings from '@/application/common/useAppSettings'
import txMigrateToATA from '@/application/migrateToATA/txMigrateToATA'
import useToken from '@/application/token/useToken'
import { refreshTokenAccounts } from '@/application/wallet/useTokenAccountsRefresher'
import useWallet from '@/application/wallet/useWallet'
import { AddressItem } from '@/components/AddressItem'
import Button from '@/components/Button'
import { Checkbox } from '@/components/Checkbox'
import CoinAvatar from '@/components/CoinAvatar'
import Col from '@/components/Col'
import Grid from '@/components/Grid'
import PageLayout from '@/components/PageLayout'
import Row from '@/components/Row'
import { toString } from '@/functions/numberish/toString'
import { useRecordedEffect } from '@/hooks/useRecordedEffect'
import { useState } from 'react'
import { useNonATATokens } from '../application/migrateToATA/useNonATATokens'

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

function MigrateATAInputCard() {
  const isMobile = useAppSettings((s) => s.isMobile)
  const isApprovePanelShown = useAppSettings((s) => s.isApprovePanelShown)
  const walletConnected = useWallet((s) => s.connected)
  const toRealSymbol = useToken((s) => s.toRealSymbol)
  const nonATATokens = useNonATATokens()
  const gridClassName =
    'grid-cols-[.1fr,1fr,1fr,1fr,1fr,1fr] mobile:grid-cols-[.1fr,2fr,2fr,2fr,2fr] gap-4 mobile:gap-2 px-3 mobile:px-2'

  const allTokenAccounts = useWallet((s) => s.allTokenAccounts)
  const [migrateKeys, setMigrateKeys] = useState<string /* Account PublicKey */[]>([])
  // reset when accounts number changed
  useRecordedEffect(
    ([prevLength = 0], [currentLength]) => {
      if (prevLength >= currentLength) {
        setMigrateKeys([])
      }
    },
    [allTokenAccounts.length]
  )

  const isAllSelected = migrateKeys.length === nonATATokens.size

  const canMigrate = migrateKeys.length > 0
  return (
    <Col>
      <div className="mb-2 text-lg mobile:text-sm">
        <Grid className={`${gridClassName}`}>
          {/* select check box */}
          <div>
            <Checkbox
              checked={isAllSelected}
              onChange={(checked) => {
                if (checked) {
                  setMigrateKeys([...nonATATokens.keys()])
                } else {
                  setMigrateKeys([])
                }
              }}
            />
          </div>
          <div className="text-[#abc4ff80]">Token</div>
          <div className="text-[#abc4ff80]">Amount</div>
          <div className="text-[#abc4ff80]">Mint</div>
          <div className="text-[#abc4ff80]">Account</div>
          {!isMobile && <div className="text-[#abc4ff80]">ATA account</div>}
        </Grid>
      </div>
      {nonATATokens.size > 0
        ? [...nonATATokens.entries()].map(
            ([address, { token, tokenAccount, ataToken, ataTokenAccount, tokenAmount }]) => (
              <Grid
                key={address}
                className={`${gridClassName}  rounded-lg items-center py-3 odd:bg-[#abc4ff1a] text-[#abc4ff]`}
              >
                <div>
                  <Checkbox
                    checked={migrateKeys.includes(address)}
                    onChange={(checked) => {
                      if (checked) {
                        setMigrateKeys((keys) => [...keys, address])
                      } else {
                        setMigrateKeys((keys) => keys.filter((k) => k !== address))
                      }
                    }}
                  ></Checkbox>
                </div>
                <Row className="items-center mobile:flex-col gap-2 mobile:gap-0 mobile:items-start">
                  <CoinAvatar token={token} size={isMobile ? 'sm' : 'md'} />
                  <div className={isMobile ? 'text-sm' : undefined}>{toRealSymbol(token)}</div>
                </Row>
                <div className="text-lg mobile:text-base text-[#fff]">{toString(tokenAmount)}</div>
                {
                  <div className="justify-self-start">
                    <AddressItem
                      iconSize={isMobile ? 'xs' : undefined}
                      textClassName="text-md mobile:text-xs text-[#abc4ff]"
                      showDigitCount={isMobile ? 3 : 5}
                      canCopy
                      showCopyIcon={!isMobile}
                    >
                      {tokenAccount.mint}
                    </AddressItem>
                  </div>
                }
                <div className="justify-self-start">
                  <AddressItem
                    iconSize={isMobile ? 'xs' : undefined}
                    textClassName="text-md mobile:text-xs text-[#abc4ff]"
                    showDigitCount={isMobile ? 3 : 4}
                    canCopy
                    showCopyIcon={!isMobile}
                    canExternalLink
                  >
                    {tokenAccount.publicKey}
                  </AddressItem>
                </div>
                {!isMobile && (
                  <div className="justify-self-start">
                    {ataToken ? (
                      <AddressItem
                        iconSize={isMobile ? 'xs' : undefined}
                        textClassName="text-md mobile:text-xs text-[#abc4ff]"
                        showDigitCount={isMobile ? 3 : 4}
                        canCopy
                        showCopyIcon={!isMobile}
                        canExternalLink
                      >
                        {ataTokenAccount?.publicKey}
                      </AddressItem>
                    ) : null}
                  </div>
                )}
              </Grid>
            )
          )
        : null}

      <Button
        size="lg"
        className="mx-auto w-[40em] mobile:w-full frosted-glass-teal mt-5"
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
            fallbackProps: { children: 'Select accounts to migrate' }
          }
        ]}
        onClick={() => {
          txMigrateToATA(migrateKeys, {
            onTxSuccess: () => {
              refreshTokenAccounts()
            }
          })
        }}
      >
        Migrate to ATA
      </Button>
    </Col>
  )
}
