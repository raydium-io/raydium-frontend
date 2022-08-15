import React, { useState } from 'react'
import { twMerge } from 'tailwind-merge'
import useAppSettings from '@/application/appSettings/useAppSettings'
import useToken from '@/application/token/useToken'
import useWallet from '@/application/wallet/useWallet'
import Button from '@/components/Button'
import Collapse from '@/components/Collapse'
import Grid from '@/components/Grid'
import Icon from '@/components/Icon'
import Row from '@/components/Row'
import { toTokenAmount } from '@/functions/format/toTokenAmount'
import { gt, lt } from '@/functions/numberish/compare'
import { toString } from '@/functions/numberish/toString'
import InputBox from '@/components/InputBox'
import Card from '@/components/Card'
import { getNewWalletSignature } from '@/application/staking/getSignMessage'
import { isValidPublicKey } from '@/functions/judgers/dateType'
import useNotification from '@/application/notification/useNotification'
import { checkStakingRay, getWalletMigrateHistory, setWalletMigrateTarget } from '@/application/staking/migrateWallet'
import { HexAddress } from '@/types/constants'
import useAsyncEffect from '@/hooks/useAsyncEffect'
import { AddressItem } from '@/components/AddressItem'
import { isMintEqual } from '@/functions/judgers/areEqual'
import useConnection from '@/application/connection/useConnection'
import { capitalize } from '@/functions/changeCase'
import { RAYMint } from '@/application/token/wellknownToken.config'
import useAsyncMemo from '@/hooks/useAsyncMemo'
import Tooltip from '@/components/Tooltip'
import Link from '@/components/Link'
import Col from '@/components/Col'
import toPubString from '@/functions/format/toMintString'
import FadeInStable from '@/components/FadeIn'
import Input from '@/components/Input'

export function MigrateStakingHistory({ className }: { className?: string }) {
  const isMobile = useAppSettings((s) => s.isMobile)
  return (
    <div className={twMerge('gap-y-8 pb-4 pt-2', className)}>
      <Collapse>
        <Collapse.Face>
          {(open) => (
            <Row
              className={`text-2xl pr-6 w-max mobile:text-lg font-semibold justify-self-start items-center gap-2 mobile:gap-1 text-white ${
                open ? '' : 'hover:opacity-90 opacity-30 mobile:opacity-70'
              }`}
            >
              <div>Migrate Staking History</div>
              <Icon heroIconName={open ? 'chevron-up' : 'chevron-down'} size={isMobile ? 'xs' : 'smi'}></Icon>
            </Row>
          )}
        </Collapse.Face>
        <Collapse.Body>
          <Grid className="w-full pt-8 mobile:pt-4">
            <Col className="justify-self-center items-center">
              <MigrateStakingDescription />
              <MigrateStakingWalletTool />
            </Col>
          </Grid>
        </Collapse.Body>
      </Collapse>
    </div>
  )
}

function MigrateStakingDescription({ className }: { className?: string }) {
  return (
    <Card
      className="w-[min(552px,100%)] py-6 px-8 mobile:p-4 text-sm mobile:text-xs rounded-2xl mobile:rounded-xl text-[#abc4ff] bg-[#ABC4FF20] mb-4"
      size="lg"
    >
      <div className="mb-2">
        This tool links RAY staking history from an old wallet to a new wallet and is available until{' '}
        <span className="font-semibold">August 19, 10:00 UTC.</span> Migration is optional.
      </div>

      <div className="mb-2">
        This tool only migrates <span className="italic">staking snapshot history</span> to a new wallet, it{' '}
        <span className="font-semibold mx-1">DOES NOT</span>
        unstake, stake or transfer <span className="font-semibold">ANY</span> funds
      </div>

      <div className="mb-2">
        Read <Link href="https://docs.raydium.io/raydium/updates/staking-history-tool">full details here</Link> before
        proceeding.
      </div>
    </Card>
  )
}

function MigrateStakingWalletTool({ className }: { className?: string }) {
  const owner = useWallet((s) => s.owner)
  const getToken = useToken((s) => s.getToken)
  const [targetWallet, setTargetWallet] = useState<string>()
  const [isSubmittingData, setIsSubmittingData] = useState(false)
  const [isCancelingData, setIsCancelingData] = useState(false)
  const [currentBindTargetWalletAddress, setCurrentBindTargetWalletAddress] = useState<HexAddress>()
  const logError = useNotification((s) => s.logError)
  const logSuccess = useNotification((s) => s.logSuccess)
  const connection = useConnection((s) => s.connection)
  const isMobile = useAppSettings((s) => s.isMobile)
  const rayToken = getToken(RAYMint)

  const getWalletBind = async () => {
    const wallet = owner && (await getWalletMigrateHistory(owner))
    setCurrentBindTargetWalletAddress(isMintEqual(owner, wallet) ? undefined : wallet)
    setTargetWallet('')
  }
  useAsyncEffect(getWalletBind, [owner])

  const targetWalletRay = useAsyncMemo(
    async () =>
      connection && targetWallet?.trim() && isValidPublicKey(targetWallet.trim())
        ? await checkStakingRay(targetWallet, { connection })
        : undefined,
    [targetWallet, connection],
    undefined
  )

  return (
    <Card
      className={twMerge(
        'w-[min(552px,100%)] py-6 px-8 space-y-8 mobile:p-4 flex flex-col rounded-3xl mobile:rounded-xl border-1.5 border-[rgba(171,196,255,0.2)] bg-cyberpunk-card-bg shadow-cyberpunk-card',
        className
      )}
      size="lg"
    >
      <Row className="mb-4 mobile:mb-3">
        <div className="text-lg mobile:text-sm font-semibold">Migrate RAY staking history to new wallet</div>
      </Row>

      <Row className="text-[#abc4ff] text-sm">
        1. Stake RAY using <span className="font-semibold mx-1">NEW</span> wallet address
      </Row>

      <div>
        <Row className="text-[#abc4ff] text-sm mb-1">
          2. Input <span className="font-semibold mx-1">NEW</span> wallet address
        </Row>
        <div>
          <Row className="items-center justify-between px-4 py-1 gap-8">
            <div className="text-sm mobile:text-xs text-[#abc4ff80]">New wallet address:</div>
            <div className="rounded-lg bg-[#141041] py-2 px-4 ">
              <Input
                value={targetWallet}
                className="mobile:text-sm"
                onUserInput={(v) => setTargetWallet(v.trim())}
              ></Input>
            </div>
          </Row>
          <FadeInStable show={rayToken && targetWalletRay}>
            <Row className="items-center justify-between px-4 py-1">
              <div className="text-sm mobile:text-xs text-[#abc4ff80]">New wallet RAY staked:</div>
              <div className="text-sm mobile:text-xs">
                <span className={lt(targetWalletRay, 0) ? 'text-[#DA2EEF]' : ''}>
                  {rayToken && targetWalletRay ? toString(toTokenAmount(rayToken!, targetWalletRay)) : '--'}
                </span>
                <span className="text-[#abc4ff80] ml-1">RAY</span>
              </div>
            </Row>
          </FadeInStable>
        </div>
      </div>

      <div>
        <Row className="text-[#abc4ff] text-sm">
          3. Connect <span className="font-semibold mx-1">OLD</span> wallet address
        </Row>
        <div>
          {owner ? (
            <Row className="items-center justify-between px-4 py-1">
              <div className="text-sm mobile:text-xs text-[#abc4ff80]">Old wallet address:</div>
              <AddressItem showDigitCount={isMobile ? 6 : 12} textClassName="mobile:text-xs">
                {toPubString(owner)}
              </AddressItem>
            </Row>
          ) : (
            <Row className="items-center justify-between px-4 py-1">
              <Button
                className="my-2 mx-auto px-8 frosted-glass-teal mobile:w-full"
                onClick={() => useAppSettings.setState({ isWalletSelectorShown: true })}
              >
                Connect Old Wallet
              </Button>
            </Row>
          )}
        </div>
      </div>

      <div>
        <div className="text-[#abc4ff] text-sm">4. Migrate</div>
        <Col className="justify-center">
          <Row className="gap-8 mobile:gap-4">
            <Button
              className="my-2 mx-auto px-8 frosted-glass-teal min-w-[12em] mobile:w-full"
              size={isMobile ? 'sm' : 'md'}
              isLoading={isSubmittingData}
              validators={[
                {
                  should: !currentBindTargetWalletAddress || isValidPublicKey(targetWallet),
                  fallbackProps: { children: 'Wallet Linked' }
                },
                { should: targetWallet },
                { should: isValidPublicKey(targetWallet) },
                {
                  should: !isMintEqual(targetWallet, currentBindTargetWalletAddress),
                  fallbackProps: { children: 'Wallet already linked' }
                },
                {
                  // TODO: loading
                  should: targetWalletRay && gt(targetWalletRay, 0),
                  fallbackProps: {
                    children: 'New wallet must stake RAY'
                  }
                }
              ]}
              onClick={async () => {
                try {
                  const newWallet = targetWallet?.trim()
                  if (!newWallet) return

                  // check connection
                  if (!connection) {
                    logError('Connection Error', 'No connection')
                    return
                  }

                  // check target staking Ray
                  if (!(await checkStakingRay(newWallet, { connection }))) {
                    logError('Validation Error', 'New wallet must stake RAY')
                    return
                  }

                  // encode sign message
                  setIsSubmittingData(true)
                  const signature = await getNewWalletSignature(newWallet)
                  if (!signature) {
                    logError('Encode Error', 'Fail to encode')
                    return
                  }

                  // send migrate wallet
                  const resultResponse = await setWalletMigrateTarget(owner!, newWallet, {
                    signature: signature
                  })
                  if (resultResponse?.success) {
                    logSuccess('Migration Success', 'RAY staking successfully linked to new wallet')
                  } else {
                    logError('Migration Error', capitalize(resultResponse?.msg ?? ''))
                  }
                } finally {
                  setIsSubmittingData(false)
                  getWalletBind()
                }
              }}
            >
              {currentBindTargetWalletAddress ? 'Update migration' : 'Migrate'}
            </Button>
            {currentBindTargetWalletAddress && (
              <Button
                className="my-2 mx-auto px-8 frosted-glass-skygray mobile:w-full"
                size={isMobile ? 'sm' : 'md'}
                isLoading={isCancelingData}
                onClick={async () => {
                  try {
                    const newWallet = toPubString(owner)?.trim()
                    if (!newWallet) return

                    // check connection
                    if (!connection) {
                      logError('Connection Error', 'No connection')
                      return
                    }

                    // encode sign message
                    setIsCancelingData(true)
                    const signature = await getNewWalletSignature(newWallet)
                    if (!signature) {
                      logError('Encode Error', 'Fail to encode')
                      return
                    }

                    // send migrate wallet
                    const resultResponse = await setWalletMigrateTarget(owner!, newWallet, {
                      signature
                    })
                    if (resultResponse?.success) {
                      logSuccess('Wallet Link Reset', 'Wallet link has been reset')
                    } else {
                      logError('Reset Error', capitalize(resultResponse?.msg ?? ''))
                    }
                  } finally {
                    setIsCancelingData(false)
                    getWalletBind()
                  }
                }}
              >
                Unlink Wallet
              </Button>
            )}
          </Row>

          <FadeInStable show={currentBindTargetWalletAddress}>
            <Row className="mt-2 items-center justify-between ">
              <div className="text-base mobile:text-xs text-[#abc4ff]">Linked new wallet address:</div>
              <AddressItem showDigitCount={isMobile ? 6 : 12} textClassName="mobile:text-xs">
                {currentBindTargetWalletAddress}
              </AddressItem>
            </Row>
          </FadeInStable>
        </Col>
      </div>
    </Card>
  )
}
