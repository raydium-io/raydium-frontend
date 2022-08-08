import React, { ReactNode, useMemo, useState } from 'react'
import { useRouter } from 'next/router'

import { Fraction, TokenAmount, ZERO } from '@raydium-io/raydium-sdk'

import { twMerge } from 'tailwind-merge'

import useAppSettings from '@/application/appSettings/useAppSettings'
import txFarmHarvest from '@/application/farms/txFarmHarvest'
import { HydratedFarmInfo } from '@/application/farms/type'
import useFarms from '@/application/farms/useFarms'
import useStaking from '@/application/staking/useStaking'
import useToken from '@/application/token/useToken'
import useWallet from '@/application/wallet/useWallet'
import AutoBox from '@/components/AutoBox'
import Button from '@/components/Button'
import CoinAvatar from '@/components/CoinAvatar'
import Col from '@/components/Col'
import Collapse from '@/components/Collapse'
import CyberpunkStyleCard from '@/components/CyberpunkStyleCard'
import Grid from '@/components/Grid'
import Icon from '@/components/Icon'
import PageLayout from '@/components/PageLayout'
import RefreshCircle from '@/components/RefreshCircle'
import Row from '@/components/Row'
import formatNumber from '@/functions/format/formatNumber'
import toPercentString from '@/functions/format/toPercentString'
import { toTokenAmount } from '@/functions/format/toTokenAmount'
import toTotalPrice from '@/functions/format/toTotalPrice'
import toUsdVolume from '@/functions/format/toUsdVolume'
import { gt, isMeaningfulNumber, lt } from '@/functions/numberish/compare'
import { add } from '@/functions/numberish/operations'
import { toString } from '@/functions/numberish/toString'
import LoadingCircle from '@/components/LoadingCircle'
import { StakingPageStakeLpDialog } from '../pageComponents/dialogs/StakingPageStakeLpDialog'
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
import BN from 'bn.js'
import FadeInStable from '@/components/FadeIn'
import useAsyncValue from '@/hooks/useAsyncValue'
import { RAYMint } from '@/application/token/wellknownToken.config'
import useAsyncMemo from '@/hooks/useAsyncMemo'

export default function StakingPage() {
  return (
    <PageLayout mobileBarTitle="Staking" metaTitle="Staking - Raydium" contentButtonPaddingShorter>
      <StakingHeader />
      <StakingCard />

      <AdvancedTools className="mt-[10vh]" />
    </PageLayout>
  )
}

function StakingHeader() {
  const refreshFarmInfos = useFarms((s) => s.refreshFarmInfos)
  return (
    <Grid className="grid-cols-[1fr,1fr] items-center gap-y-8 pb-4 pt-2">
      <div className="title text-2xl mobile:text-lg font-semibold justify-self-start text-white">Staking</div>
      <div className="justify-self-end">
        <RefreshCircle
          refreshKey="staking"
          popPlacement="left"
          className="justify-self-end"
          freshFunction={refreshFarmInfos}
        />
      </div>
    </Grid>
  )
}

function AdvancedTools({ className }: { className?: string }) {
  const isMobile = useAppSettings((s) => s.isMobile)
  return (
    <div className={twMerge('gap-y-8 pb-4 pt-2', className)}>
      <Collapse>
        <Collapse.Face>
          {(open) => (
            <Row
              className={`text-2xl mobile:text-lg font-semibold justify-self-start items-center gap-4 mobile:gap-2 text-white ${
                open ? '' : 'hover:opacity-90 opacity-30 mobile:opacity-70'
              }`}
            >
              <div>Advanced Tool</div>
              <Icon heroIconName={open ? 'chevron-up' : 'chevron-down'} size={isMobile ? 'sm' : 'lg'}></Icon>
            </Row>
          )}
        </Collapse.Face>
        <Collapse.Body>
          <Grid className="w-full pt-8 mobile:pt-4">
            <MigrateStakingWalletTool className="justify-self-center" />
          </Grid>
        </Collapse.Body>
      </Collapse>
    </div>
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
        'w-[min(552px,100%)] py-6 px-8 mobile:p-4 flex flex-col rounded-3xl mobile:rounded-xl border-1.5 border-[rgba(171,196,255,0.2)]  bg-cyberpunk-card-bg shadow-cyberpunk-card',
        className
      )}
      size="lg"
    >
      <div className="text-lg mobile:text-sm font-semibold mb-4 mobile:mb-3">Migrate staking RAY to new wallet</div>
      <InputBox label="New wallet:" className="mb-4 mobile:mb-3" value={targetWallet} onUserInput={setTargetWallet} />
      <div className="mb-3 mobile:mb-2">
        <Row className="items-center justify-between py-1">
          <div className="text-sm mobile:text-xs font-semibold text-[#abc4ff80]">New wallet RAY:</div>
          <div className="text-sm mobile:text-xs">
            <span className={lt(targetWalletRay, 0) ? 'text-[#DA2EEF]' : ''}>
              {rayToken && targetWalletRay ? toString(toTokenAmount(rayToken!, targetWalletRay)) : '--'}
            </span>{' '}
            <span className="text-[#abc4ff80]">RAY</span>
          </div>
        </Row>
        {currentBindTargetWalletAddress && (
          <Row className="items-center justify-between">
            <div className="text-sm mobile:text-xs font-semibold text-[#abc4ff80]">Current bind:</div>
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
              children: 'Connect Wallet'
            }
          },
          { should: targetWallet },
          { should: isValidPublicKey(targetWallet) },
          { should: !isMintEqual(targetWallet, currentBindTargetWalletAddress), fallbackProps: { children: 'Binded' } },
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
              logSuccess('Migrate Success', 'Success to migrate staking RAY to new safe wallet')
            } else {
              logError('Migrate Error', capitalize(resultResponse?.msg ?? ''))
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

function StakingCard() {
  const hydratedInfos = useFarms((s) => s.hydratedInfos)
  const infos = useMemo(() => hydratedInfos.filter((i) => i.isStakePool), [hydratedInfos])
  if (!infos.length)
    return (
      <Row className="text-center justify-center text-2xl p-12 opacity-50 text-[rgb(171,196,255)]">
        <LoadingCircle />
      </Row>
    )
  return (
    <CyberpunkStyleCard>
      <Row type="grid" className="gap-3 text-[#ABC4FF]">
        {infos.map((info) => (
          <div key={String(info.id)}>
            <Collapse>
              <Collapse.Face>{(open) => <StakingCardCollapseItemFace open={open} info={info} />}</Collapse.Face>
              <Collapse.Body>
                <StakingCardCollapseItemContent hydratedInfo={info} />
              </Collapse.Body>
            </Collapse>
          </div>
        ))}
        <StakingPageStakeLpDialog />
      </Row>
    </CyberpunkStyleCard>
  )
}

function StakingCardCollapseItemFace({ open, info }: { open: boolean; info: HydratedFarmInfo }) {
  const isMobile = useAppSettings((s) => s.isMobile)
  const pcCotent = (
    <Row
      type="grid-x"
      className={`py-5 px-8 mobile:py-4 mobile:px-5 gap-2 items-stretch grid-cols-[1.5fr,1fr,1fr,1fr,1fr,auto] mobile:grid-cols-[1fr,1fr,1fr,auto] rounded-t-3xl mobile:rounded-t-lg ${
        open ? '' : 'rounded-b-3xl mobile:rounded-b-lg'
      }`}
    >
      <CoinAvatarInfoItem info={info} />

      <TextInfoItem
        name="Pending Rewards"
        value={
          <div>
            {info.rewards.map(
              ({ token, userPendingReward, userHavedReward }, idx) =>
                userHavedReward && (
                  <div key={idx}>
                    {toString(userPendingReward ?? 0)} {token?.symbol}
                  </div>
                )
            )}
          </div>
        }
      />
      <TextInfoItem
        name="Staked"
        value={
          info.base && info.ledger
            ? `${toString(toTokenAmount(info.base, info.ledger.deposited))} ${info.base?.symbol ?? ''}`
            : `0 ${info.base?.symbol ?? ''}`
        }
      />

      <TextInfoItem name="APR" value={info.totalApr7d ? toPercentString(info.totalApr7d) : '0%'} />

      <TextInfoItem
        name="Total Staked"
        value={info.tvl ? `~${toUsdVolume(info.tvl, { decimalPlace: 0 })}` : '--'}
        subValue={
          info.stakedLpAmount &&
          `${formatNumber(toString(info.stakedLpAmount, { decimalLength: 0 }))} ${info.base?.symbol ?? ''}`
        }
      />

      <Grid className="w-9 h-9 place-items-center self-center">
        <Icon size="sm" className="justify-self-end mr-1.5" heroIconName={`${open ? 'chevron-up' : 'chevron-down'}`} />
      </Grid>
    </Row>
  )

  const mobileContent = (
    <Collapse open={open}>
      <Collapse.Face>
        <Row
          type="grid-x"
          className={`py-4 px-5 items-center gap-2 grid-cols-[1fr,1fr,1fr,auto] mobile:rounded-t-lg ${
            open ? '' : 'rounded-b-3xl mobile:rounded-b-lg'
          }`}
        >
          <CoinAvatarInfoItem info={info} />

          <TextInfoItem
            name="Pending Rewards"
            value={
              <div>
                {info.rewards.map(
                  ({ token, userPendingReward, userHavedReward }, idx) =>
                    userHavedReward && (
                      <div key={idx}>
                        {toString(userPendingReward ?? 0)} {token?.symbol ?? ''}
                      </div>
                    )
                )}
              </div>
            }
          />

          {/* {console.log(info)} */}
          <TextInfoItem name="APR" value={info.totalApr7d ? toPercentString(info.totalApr7d) : '--'} />

          <Grid className="w-6 h-6 place-items-center">
            <Icon size="sm" heroIconName={`${open ? 'chevron-up' : 'chevron-down'}`} />
          </Grid>
        </Row>
      </Collapse.Face>

      <Collapse.Body>
        <Row type="grid-x" className="py-4 px-5 relative items-stretch gap-2 grid-cols-[1fr,1fr,1fr,auto]">
          <div className="absolute top-0 left-5 right-5 border-[rgba(171,196,255,.2)] border-t-1.5"></div>

          <TextInfoItem
            name="Staked"
            value={info.base && info.ledger ? toString(toTokenAmount(info.base, info.ledger.deposited)) : '--'}
          />

          <TextInfoItem
            name="Total Staked"
            value={info.tvl ? `≈${toUsdVolume(info.tvl, { autoSuffix: true })}` : '--'}
            subValue={info.stakedLpAmount && `${formatNumber(toString(info.stakedLpAmount, { decimalLength: 0 }))} RAY`}
          />
          <div></div>

          <Grid className="w-6 h-6 place-items-center"></Grid>
        </Row>
      </Collapse.Body>
    </Collapse>
  )

  return isMobile ? mobileContent : pcCotent
}

function StakingCardCollapseItemContent({ hydratedInfo }: { hydratedInfo: HydratedFarmInfo }) {
  const prices = useToken((s) => s.tokenPrices)
  const isMobile = useAppSettings((s) => s.isMobile)
  const connected = useWallet((s) => s.connected)
  const hasPendingReward = useMemo(
    () =>
      gt(
        hydratedInfo.rewards.reduce((acc, reward) => add(acc, reward.userPendingReward ?? ZERO), new Fraction(ZERO)),
        ZERO
      ),
    [hydratedInfo]
  )
  const isApprovePanelShown = useAppSettings((s) => s.isApprovePanelShown)
  return (
    <AutoBox
      is={isMobile ? 'Col' : 'Row'}
      className={`gap-8 mobile:gap-3 flex-grow px-8 py-5 mobile:px-4 mobile:py-3 bg-gradient-to-br from-[rgba(171,196,255,0.12)] to-[rgba(171,196,255,0.06)]  rounded-b-3xl mobile:rounded-b-lg`}
    >
      <Row className="p-6 mobile:py-3 mobile:px-4 flex-grow ring-inset ring-1.5 mobile:ring-1 ring-[rgba(171,196,255,.5)] rounded-3xl mobile:rounded-xl items-center gap-3">
        <div className="flex-grow">
          <div className="text-[rgba(171,196,255,0.5)] font-medium text-sm mobile:text-2xs mb-1">Deposited</div>
          <div className="text-white font-medium text-base mobile:text-xs">
            {formatNumber(toString(hydratedInfo.userStakedLpAmount ?? 0), {
              fractionLength: hydratedInfo.userStakedLpAmount?.token.decimals
            })}{' '}
            RAY
          </div>
          <div className="text-[rgba(171,196,255,0.5)] font-medium text-sm mobile:text-xs">
            {prices[String(hydratedInfo.lpMint)] && hydratedInfo.userStakedLpAmount
              ? toUsdVolume(toTotalPrice(hydratedInfo.userStakedLpAmount, prices[String(hydratedInfo.lpMint)]))
              : '--'}
          </div>
        </div>
        <Row className="gap-3">
          {hydratedInfo.userHasStaked ? (
            <>
              <Button
                className="frosted-glass-teal mobile:px-6 mobile:py-2 mobile:text-xs"
                onClick={() => {
                  if (connected) {
                    useStaking.setState({
                      isStakeDialogOpen: true,
                      stakeDialogMode: 'deposit'
                    })
                  } else {
                    useAppSettings.setState({ isWalletSelectorShown: true })
                  }
                }}
              >
                Stake
              </Button>
              <Icon
                size={isMobile ? 'sm' : 'smi'}
                heroIconName="minus"
                className="grid place-items-center w-10 h-10 mobile:w-8 mobile:h-8 ring-inset ring-1.5 mobile:ring-1 ring-[rgba(171,196,255,.5)] rounded-xl mobile:rounded-lg text-[rgba(171,196,255,.5)] clickable clickable-filter-effect"
                onClick={() => {
                  if (connected) {
                    useStaking.setState({
                      isStakeDialogOpen: true,
                      stakeDialogMode: 'withdraw'
                    })
                  } else {
                    useAppSettings.setState({ isWalletSelectorShown: true })
                  }
                }}
              />
            </>
          ) : (
            <Button
              className="frosted-glass-teal mobile:py-2 mobile:text-xs"
              onClick={() => {
                if (connected) {
                  useStaking.setState({
                    isStakeDialogOpen: true,
                    stakeDialogMode: 'deposit'
                  })
                } else {
                  useAppSettings.setState({ isWalletSelectorShown: true })
                }
              }}
            >
              {connected ? 'Start Staking' : 'Connect Wallet'}
            </Button>
          )}
        </Row>
      </Row>

      <AutoBox
        is={isMobile ? 'Col' : 'Row'}
        className={twMerge(
          'p-6 mobile:py-3 mobile:px-4 flex-grow ring-inset ring-1.5 mobile:ring-1 ring-[rgba(171,196,255,.5)] rounded-3xl mobile:rounded-xl items-center gap-3'
        )}
      >
        <Row className="flex-grow divide-x-1.5 w-full">
          {hydratedInfo.rewards?.map(
            (reward, idx) =>
              reward.userHavedReward && (
                <div
                  key={idx}
                  className={`px-4 ${idx === 0 ? 'pl-0' : ''} ${
                    idx === hydratedInfo.rewards.length - 1 ? 'pr-0' : ''
                  } border-[rgba(171,196,255,.5)]`}
                >
                  <div className="text-[rgba(171,196,255,0.5)] font-medium text-sm mobile:text-2xs mb-1">
                    Pending rewards
                  </div>
                  <div className="text-white font-medium text-base mobile:text-xs">
                    {toString(reward.userPendingReward ?? 0)} {reward.token?.symbol}
                  </div>
                  <div className="text-[rgba(171,196,255,0.5)] font-medium text-sm mobile:text-2xs">
                    {prices?.[String(reward.token?.mint)] && reward?.userPendingReward
                      ? toUsdVolume(toTotalPrice(reward.userPendingReward, prices[String(reward.token?.mint)]))
                      : '--'}
                  </div>
                </div>
              )
          )}
        </Row>
        <Button
          // disable={Number(info.pendingReward?.numerator) <= 0}
          className="frosted-glass frosted-glass-teal rounded-xl mobile:w-full mobile:py-2 mobile:text-xs whitespace-nowrap"
          isLoading={isApprovePanelShown}
          onClick={() => {
            txFarmHarvest(hydratedInfo, {
              isStaking: true,
              rewardAmounts: hydratedInfo.rewards
                .map(({ userPendingReward }) => userPendingReward)
                .filter(isMeaningfulNumber) as TokenAmount[]
            })
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
            { should: hasPendingReward }
          ]}
        >
          Harvest
        </Button>
      </AutoBox>
    </AutoBox>
  )
}

function CoinAvatarInfoItem({ info }: { info: HydratedFarmInfo }) {
  const { base, name } = info
  const isMobile = useAppSettings((s) => s.isMobile)
  return (
    <AutoBox
      is={isMobile ? 'Col' : 'Row'}
      className="clickable flex-wrap items-center mobile:items-start"
      // onClick={() => {
      //   push(`/liquidity/?coin1=${base?.mint}&coin2=${quote?.mint}`)
      // }}
    >
      <CoinAvatar size={isMobile ? 'sm' : 'md'} token={base} className="justify-self-center mr-2" />
      <div className="mobile:text-xs font-medium mobile:mt-px mr-1.5">{name}</div>
    </AutoBox>
  )
}

function TextInfoItem({
  name,
  value,
  subValue,
  className
}: {
  name: string
  value?: ReactNode
  subValue?: ReactNode
  className?: string
}) {
  return (
    <Col className={twMerge('w-max', className)}>
      <div className="mb-1 text-[rgba(171,196,255,0.5)] font-medium text-sm mobile:text-2xs">{name}</div>
      <Col className="flex-grow justify-center">
        <div className="text-base mobile:text-xs">{value || '--'}</div>
        {subValue && <div className="text-sm mobile:text-2xs text-[rgba(171,196,255,0.5)]">{subValue}</div>}
      </Col>
    </Col>
  )
}
