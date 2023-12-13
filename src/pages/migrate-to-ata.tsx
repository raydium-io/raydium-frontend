import useAppSettings from '@/application/common/useAppSettings'
import { useFarmFavoriteIds } from '@/application/farms/useFarms'
import txMigrateToATA from '@/application/migrateToATA/txMigrateToATA'
import useToken from '@/application/token/useToken'
import useWallet from '@/application/wallet/useWallet'
import { AddressItem } from '@/components/AddressItem'
import Button from '@/components/Button'
import { Checkbox } from '@/components/Checkbox'
import CoinAvatar from '@/components/CoinAvatar'
import Col from '@/components/Col'
import Grid from '@/components/Grid'
import PageLayout from '@/components/PageLayout'
import { useEffect, useState } from 'react'
import { useNonATATokens } from '../application/migrateToATA/useNonATATokens'
import { toString } from '@/functions/numberish/toString'
import Row from '@/components/Row'

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
  const isApprovePanelShown = useAppSettings((s) => s.isApprovePanelShown)
  const walletConnected = useWallet((s) => s.connected)
  const toRealSymbol = useToken((s) => s.toRealSymbol)
  const nonATATokens = useNonATATokens()
  const gridClassName = 'grid-cols-[.1fr,1fr,1fr,1fr,1fr,1fr] px-3'

  const allTokenAccounts = useWallet((s) => s.allTokenAccounts)
  const [migrateKeys, setMigrateKeys] = useState<string /* Account PublicKey */[]>([])
  // reset when accounts number changed
  useEffect(() => {
    setMigrateKeys([])
  }, [allTokenAccounts.length])
  const canMigrate = migrateKeys.length > 0
  return (
    <Col>
      <div>
        <Grid className={`${gridClassName} gap-4`}>
          {/* select check box */}
          <div></div>
          <div className="text-[#abc4ff80]">Token</div>
          <div className="text-[#abc4ff80]">Amount</div>
          <div className="text-[#abc4ff80]">Mint</div>
          <div className="text-[#abc4ff80]">Account</div>
          <div className="text-[#abc4ff80]">ATA account</div>
        </Grid>
      </div>
      {nonATATokens.size > 0
        ? [...nonATATokens.entries()].map(
            ([address, { token, tokenAccount, ataToken, ataTokenAccount, tokenAmount }]) => (
              <Grid
                key={address}
                className={`${gridClassName} gap-4 items-center py-3 odd:bg-[#abc4ff1a] text-[#abc4ff]`}
              >
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
                <Row className="items-center gap-2">
                  <CoinAvatar token={token} size="md" />
                  <div>{toRealSymbol(token)}</div>
                </Row>
                <div className="text-lg text-[#fff]">{toString(tokenAmount)}</div>
                <div className="justify-self-start">
                  <AddressItem textClassName="text-md text-[#abc4ff]" showDigitCount={5} canCopy>
                    {tokenAccount.mint}
                  </AddressItem>
                </div>
                <div className="justify-self-start">
                  <AddressItem textClassName="text-md text-[#abc4ff]" showDigitCount={4} canCopy canExternalLink>
                    {tokenAccount.publicKey}
                  </AddressItem>
                </div>
                <div className="justify-self-start">
                  {ataToken ? (
                    <AddressItem textClassName="text-md text-[#abc4ff]" showDigitCount={4} canCopy canExternalLink>
                      {ataTokenAccount?.publicKey}
                    </AddressItem>
                  ) : null}
                </div>
              </Grid>
            )
          )
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
            fallbackProps: { children: 'Select accounts to migrate' }
          }
        ]}
        onClick={() => {
          txMigrateToATA(migrateKeys)
        }}
      >
        Migrate to ATA
      </Button>
    </Col>
  )
}
