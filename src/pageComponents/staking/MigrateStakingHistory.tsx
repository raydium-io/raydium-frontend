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
      className="w-[min(552px,100%)] py-6 px-8 mobile:p-4 text-sm mobile:text-xs rounded-2xl mobile:rounded-xl text-[#abc4ff] bg-[#ABC4FF40] mb-4"
      size="lg"
    >
      <div className="mb-2">
        This tool links RAY staking history from an old wallet to a new wallet and is available until{' '}
        <span className="font-semibold">August 19, 10:00 UTC.</span>
      </div>
      <div>
        Migrating staking history is optional, read full details{' '}
        <Link href="https://docs.raydium.io/raydium/updates/staking-history-tool">here</Link> before proceeding.
      </div>
    </Card>
  )
}
function MigrateStakingWalletTool({ className }: { className?: string }) {
  const owner = useWallet((s) => s.owner)
  const getToken = useToken((s) => s.getToken)
  const [targetWallet, setTargetWallet] = useState<string>()
  const [isSubmittingData, setIsSubmittingData] = useState(false)
  const [currentBindTargetWalletAddress, setCurrentBindTargetWalletAddress] = useState<HexAddress>()
  const logError = useNotification((s) => s.logError)
  const logSuccess = useNotification((s) => s.logSuccess)
  const connection = useConnection((s) => s.connection)
  const isMobile = useAppSettings((s) => s.isMobile)
  const rayToken = getToken(RAYMint)

  const getWalletBind = async () => {
    const wallet = owner && (await getWalletMigrateHistory(owner))
    setCurrentBindTargetWalletAddress(wallet)
    setTargetWallet('')
  }
  useAsyncEffect(getWalletBind, [owner])

  const targetWalletRay = useAsyncMemo(
    async () =>
      connection && targetWallet && isValidPublicKey(targetWallet)
        ? await checkStakingRay(targetWallet, { connection })
        : undefined,
    [targetWallet, connection],
    undefined
  )

  return (
    <Card
      className={twMerge(
        'w-[min(552px,100%)] py-6 px-8 mobile:p-4 flex flex-col rounded-3xl mobile:rounded-xl border-1.5 border-[rgba(171,196,255,0.2)] bg-cyberpunk-card-bg shadow-cyberpunk-card',
        className
      )}
      size="lg"
    >
      <Row className="mb-4 mobile:mb-3">
        <div className="text-lg mobile:text-sm font-semibold">Migrate RAY staking history to new wallet</div>
        {/* <Tooltip>
          <Icon className="ml-1 cursor-help" size={isMobile ? 'smi' : 'md'} heroIconName="question-mark-circle" />
          <Tooltip.Panel>
            <div className="max-w-[300px]">
              Rewards are only emitted when LP tokens are staked in the farm. If there is a period when no LP tokens are
              staked, unemmitted rewards can be claimed here once farming period ends
            </div>
          </Tooltip.Panel>
        </Tooltip> */}
      </Row>
      <InputBox
        label="New wallet address:"
        labelClassName="text-sm mobile:text-xs"
        className="mb-4 mobile:mb-3"
        value={targetWallet}
        onUserInput={setTargetWallet}
      />
      <div className="mb-3 mobile:mb-2">
        <Row className="items-center justify-between py-1">
          <div className="text-sm mobile:text-xs font-semibold text-[#abc4ff80]">New wallet RAY staked:</div>
          <div className="text-sm mobile:text-xs">
            <span className={lt(targetWalletRay, 0) ? 'text-[#DA2EEF]' : ''}>
              {rayToken && targetWalletRay ? toString(toTokenAmount(rayToken!, targetWalletRay)) : '--'}
            </span>{' '}
            <span className="text-[#abc4ff80]">RAY</span>
          </div>
        </Row>
        {currentBindTargetWalletAddress && (
          <Row className="items-center justify-between">
            <div className="text-sm mobile:text-xs font-semibold text-[#abc4ff80]">Linked wallet:</div>
            <AddressItem showDigitCount={isMobile ? 6 : 12} textClassName="mobile:text-xs">
              {currentBindTargetWalletAddress}
            </AddressItem>
          </Row>
        )}
      </div>
      <Button
        className="frosted-glass-teal w-full"
        size={isMobile ? 'sm' : 'lg'}
        isLoading={isSubmittingData}
        validators={[
          {
            should: owner,
            forceActive: true,
            fallbackProps: {
              onClick: () => useAppSettings.setState({ isWalletSelectorShown: true }),
              children: 'Connect Old Wallet'
            }
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
            if (!signature?.encodedSignature) {
              logError('Encode Error', 'Fail to encode')
              return
            }

            // send migrate wallet
            const resultResponse = await setWalletMigrateTarget(owner!, newWallet, {
              signature: signature.encodedSignature
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
        Migrate
      </Button>
    </Card>
  )
}
