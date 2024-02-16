import useAppSettings from '@/application/common/useAppSettings'
import txMigrateToATA from '@/application/migrateToATA/txMigrateToATA'
import txDebugMigratePDA from '@/application/tempDebugTransactions/txAddLiquidity'
import useToken from '@/application/token/useToken'
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
import { RollingNumber } from '../components/RollingNumber'

/**
 * export some dev tools
 */
export default function DebugPage() {
  return (
    <PageLayout mobileBarTitle="Debug" metaTitle="Debug - Raydium">
      <div className="title text-3xl mobile:text-xl mobile:hidden font-semibold justify-self-start text-white mb-12 mobile:mb-4">
        Debug
      </div>
      <div className="space-y-20 mobile:space-y-10">
        <MigrateOldAccountButton />
        <MigrateATAInputCard />
      </div>
    </PageLayout>
  )
}

function MigrateOldAccountButton() {
  const [isProcessing, setIsProcessing] = useState(false)
  const isApprovePanelShown = useAppSettings((s) => s.isApprovePanelShown)
  return (
    <div>
      <div className="title text-xl mobile:text-base font-semibold justify-self-start text-white mb-4">
        Migrate to PDA
      </div>
      <div className="text-[#abc4ff] mb-4">Migrate Old Account To PDA And Harvest Reward</div>
      <Button
        className="frosted-glass-teal"
        isLoading={isProcessing || isApprovePanelShown}
        onClick={() => {
          setIsProcessing(true)
          txDebugMigratePDA().finally(() => {
            setIsProcessing(false)
          })
        }}
      >
        Migrate
      </Button>
    </div>
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

  const canMigrate = migrateKeys.length > 0
  return (
    <Col>
      <div className="mb-2 text-lg mobile:text-sm">
        <div className="title text-xl mobile:text-base font-semibold justify-self-start text-white mb-4">
          Migrate to ATA Token
        </div>

        <Grid className={`${gridClassName}`}>
          {/* select check box */}
          <div>
            <Checkbox
              checked={nonATATokens.size >= 1 && migrateKeys.length === nonATATokens.size}
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
                className={`${gridClassName} rounded-lg items-center py-3 odd:bg-[#abc4ff1a] text-[#abc4ff]`}
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
          txMigrateToATA(migrateKeys, {})
        }}
      >
        Migrate to ATA
      </Button>
    </Col>
  )
}

function NExample() {
  const strings = ['133444.444', '28.121233', '22']
  const [currentIndex, setCurrentIndex] = useState(0)
  return (
    <div>
      <Button
        className="my-4"
        onClick={() => {
          setCurrentIndex((idx) => (idx + 1) % strings.length)
        }}
      >
        change n
      </Button>
      <RollingNumber n={strings[currentIndex]} format={(n) => toString(n)} />
    </div>
  )
}
