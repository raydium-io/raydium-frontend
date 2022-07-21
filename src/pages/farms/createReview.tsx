import useAppSettings from '@/application/appSettings/useAppSettings'
import { createNewUIRewardInfo } from '@/application/createFarm/parseRewardInfo'
import txCreateNewFarm from '@/application/createFarm/txCreateNewFarm'
import useCreateFarms from '@/application/createFarm/useCreateFarm'
import useFarms from '@/application/farms/useFarms'
import { routeBack, routeTo } from '@/application/routeTools'
import { RAYMint } from '@/application/token/wellknownToken.config'
import useWallet from '@/application/wallet/useWallet'
import { AddressItem } from '@/components/AddressItem'
import Button from '@/components/Button'
import Col from '@/components/Col'
import PageLayout from '@/components/PageLayout'
import Row from '@/components/Row'
import toPubString from '@/functions/format/toMintString'
import { isMintEqual } from '@/functions/judgers/areEqual'
import { gte } from '@/functions/numberish/compare'
import { add } from '@/functions/numberish/operations'
import { toString } from '@/functions/numberish/toString'
import useToggle from '@/hooks/useToggle'
import { NewAddedRewardSummary } from '@/pageComponents/createFarm/NewAddedRewardSummary'
import { PoolInfoSummary } from '@/pageComponents/createFarm/PoolInfoSummery'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { setInterval } from '../../functions/timeout'

function useAvailableCheck() {
  useEffect(() => {
    if (!useCreateFarms.getState().isRoutedByCreateOrEdit)
      routeTo('/farms', { queryProps: { currentTab: 'Ecosystem' } })
  }, [])
}

export default function CreateFarmReviewPage() {
  const [created, { on: turnOnCreated, off: turnOffCreated }] = useToggle(false)
  const balances = useWallet((s) => s.balances)
  const rewards = useCreateFarms((s) => s.rewards)
  const { pathname } = useRouter()
  const isMobile = useAppSettings((s) => s.isMobile)
  const refreshFarmInfos = useFarms((s) => s.refreshFarmInfos)
  const [key, setKey] = useState(String(Date.now())) // hacking: same block hash can only success once
  useEffect(() => {
    setKey(String(Date.now()))
  }, [pathname])

  const rewardRayAmount = rewards.find((r) => isMintEqual(r.token?.mint, RAYMint))?.amount
  const userRayBalance = balances[toPubString(RAYMint)]
  const haveOver300Ray = gte(userRayBalance ?? 0, add(300, rewardRayAmount ?? 0)) /** Test */
  useAvailableCheck()

  const createFarmButton = (
    <Button
      className="frosted-glass-teal px-16 self-stretch mobile:w-full"
      size={isMobile ? 'sm' : 'lg'}
      validators={[{ should: haveOver300Ray, fallbackProps: { children: 'Insufficient RAY balance' } }]}
      onClick={async () => {
        txCreateNewFarm(
          {
            onReceiveFarmId(farmId) {
              useCreateFarms.setState({ farmId })
            },
            onTxSentFinally: () => {
              turnOnCreated()
              setInterval(
                () => {
                  useFarms.getState().refreshFarmInfos()
                },
                { loopCount: 3, intervalTime: 1000 * 60 }
              )
            }
          },
          key
        )
      }}
    >
      Create Farm
    </Button>
  )
  const estimatedIndicator = (
    <Col className="mt-4 text-sm font-medium items-center">
      <div>
        <span className="text-[#abc4ff80]">Fee:</span> <span className="text-[#abc4ff]">300 RAY</span>
      </div>
      <div>
        <span className="text-[#abc4ff80]">Est. transaction fee:</span>{' '}
        <span className="text-[#abc4ff]">0.002 SOL</span>
      </div>
    </Col>
  )
  const editButton = (
    <Button className="frosted-glass-skygray mobile:w-full" size={isMobile ? 'sm' : 'lg'} onClick={routeBack}>
      Edit
    </Button>
  )

  return (
    <PageLayout metaTitle="Farms - Raydium" mobileBarTitle="Create Farm">
      <div className="self-center w-[min(720px,90vw)] py-4">
        {!isMobile && (
          <div className="pb-8 text-2xl mobile:text-lg font-semibold justify-self-start text-white">Create Farm</div>
        )}

        <div className="mb-8 text-xl mobile:text-lg font-semibold justify-self-start text-white">
          Review farm details
        </div>

        <div className="mb-8">
          <div className="mb-3 text-[#abc4ff] text-sm font-medium justify-self-start">Pool</div>
          <PoolInfoSummary />
        </div>

        <div className="mb-6">
          <div className="mb-3 text-[#abc4ff] text-sm font-medium justify-self-start">Farm rewards</div>
          <NewAddedRewardSummary canUserEdit={false} />
        </div>

        <div className="font-medium text-sm mobile:text-xs text-justify leading-snug text-[#abc4ff80] mb-8">
          <span className="text-[#DA2EEF]">Please note:</span> Rewards allocated to farms cannot be withdrawn after
          farming starts. Newly created farms generally appear on Raydium 10-30 minutes after creation, depending on
          Solana network status. A one-time fee of 300 RAY is required to create a farm, which will be deposited into
          the Raydium treasury.
        </div>

        {created ? (
          <div className="text-[#39d0d8] font-medium text-center text-sm my-4">
            Your farm has been created successfully and will be live on the UI shortly
          </div>
        ) : (
          <div className="text-[#DA2EEF] font-medium text-center text-sm my-4">
            Creating a farm requires a one-time 300 RAY fee. Your RAY balance: {toString(userRayBalance) || 0} RAY
          </div>
        )}

        {created ? (
          <Col>
            <Row className="w-full gap-2 justify-center my-8">
              <Row className="items-center text-sm mobile:text-xs font-medium text-[#ABC4FF] mobile:text-2xs">
                <div className="mr-1">Your Farm ID: </div>
              </Row>
              <AddressItem canCopy showDigitCount={'all'} className="text-white mobile:text-sm font-medium">
                {useCreateFarms.getState().farmId}
              </AddressItem>
            </Row>
            <Button
              className="frosted-glass-skygray mobile:w-full"
              size={isMobile ? 'sm' : 'lg'}
              onClick={() => {
                routeTo('/farms', { queryProps: { currentTab: 'Ecosystem' } })
                refreshFarmInfos()
                setTimeout(() => {
                  useCreateFarms.setState({ rewards: [createNewUIRewardInfo()] })
                  useCreateFarms.setState({ isRoutedByCreateOrEdit: false })
                  turnOffCreated()
                }, 1000)
              }}
            >
              Back to Farms
            </Button>
          </Col>
        ) : isMobile ? (
          <Col className="gap-5 items-center">
            {estimatedIndicator}
            <Col className="items-center gap-3 w-full">
              {createFarmButton}
              {editButton}
            </Col>
          </Col>
        ) : (
          <Row className="gap-5 justify-center items-start">
            <Col className="items-center">
              {createFarmButton}
              {estimatedIndicator}
            </Col>
            {editButton}
          </Row>
        )}
      </div>
    </PageLayout>
  )
}
