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
import { gte } from '@/functions/numberish/compare'
import { toString } from '@/functions/numberish/toString'
import useToggle from '@/hooks/useToggle'
import { NewAddedRewardSummary } from '@/pageComponents/createFarm/NewAddedRewardSummary'
import { PoolInfoSummary } from '@/pageComponents/createFarm/PoolInfoSummery'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'

function useAvailableCheck() {
  useEffect(() => {
    if (!useCreateFarms.getState().isRoutedByCreateOrEdit) routeTo('/farms')
  }, [])
}

export default function CreateFarmReviewPage() {
  const [created, { on: turnOnCreated, off: turnOffCreated }] = useToggle(false)
  const balances = useWallet((s) => s.balances)
  const { pathname } = useRouter()
  const refreshFarmInfos = useFarms((s) => s.refreshFarmInfos)
  const [key, setKey] = useState(String(Date.now())) // hacking: same block hash can only success once
  useEffect(() => {
    setKey(String(Date.now()))
  }, [pathname])

  const userRayBalance = balances[toPubString(RAYMint)]
  const haveStakeOver300Ray = gte(userRayBalance ?? 0, 0 /* FIXME : for Test, true is 300  */)
  useAvailableCheck()

  return (
    <PageLayout metaTitle="Farms - Raydium">
      <div className="self-center w-[min(720px,90vw)]">
        <div className="pb-8 text-2xl mobile:text-lg font-semibold justify-self-start text-white">Create Farm</div>

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

        <div className="font-medium text-sm text-justify leading-snug text-[#abc4ff80] mb-8">
          <span className="text-[#DA2EEF]">Please note:</span> Rewards allocated to farms cannot be withdrawn after
          farming starts. Newly created farms generally appear on Raydium 10-30 minutes after creation, depending on
          Solana network status. A one-time fee of 300 RAY is required to create a farm, which will be deposited into
          the Raydium treasury.
        </div>

        {!haveStakeOver300Ray && (
          <div className="text-[#DA2EEF] font-medium text-center my-4">
            Creating a farm requires a one-time 300 RAY fee. Your RAY balance: {toString(userRayBalance) || 0} RAY
          </div>
        )}

        {created ? (
          <Col>
            <Row className="w-full gap-2 justify-center my-8">
              <Row className="items-center text-sm font-medium text-[#ABC4FF] mobile:text-2xs">
                <div className="mr-1">Your Farm ID: </div>
              </Row>
              <AddressItem canCopy showDigitCount={'all'} className="text-white font-medium">
                {useCreateFarms.getState().farmId}
              </AddressItem>
            </Row>
            <Button
              className="frosted-glass-skygray"
              size="lg"
              onClick={() => {
                useCreateFarms.setState({ rewards: [createNewUIRewardInfo()] })
                useCreateFarms.setState({ isRoutedByCreateOrEdit: false })
                routeTo('/farms')
                refreshFarmInfos()
                setTimeout(() => {
                  turnOffCreated()
                }, 1000)
              }}
            >
              Back to All Farms
            </Button>
          </Col>
        ) : (
          <Row className="gap-5 justify-center items-start">
            <Col className="items-center">
              <Button
                className="frosted-glass-teal px-16 self-stretch"
                size="lg"
                validators={[{ should: haveStakeOver300Ray, fallbackProps: { children: 'Insufficient RAY balance' } }]}
                onClick={async () => {
                  txCreateNewFarm(
                    {
                      onReceiveFarmId(farmId) {
                        useCreateFarms.setState({ farmId })
                      },
                      onTxSuccess: () => {
                        turnOnCreated()
                      }
                    },
                    key
                  )
                }}
              >
                Create Farm
              </Button>
              <Col className="mt-4 text-sm font-medium items-center">
                <div>
                  <span className="text-[#abc4ff80]">Fee:</span> <span className="text-[#abc4ff]">300 RAY</span>
                </div>
                <div>
                  <span className="text-[#abc4ff80]">Est. transaction fee:</span>{' '}
                  <span className="text-[#abc4ff]">0.002 SOL</span>
                </div>
              </Col>
            </Col>
            <Button className="frosted-glass-skygray" size="lg" onClick={routeBack}>
              Edit
            </Button>
          </Row>
        )}
      </div>
    </PageLayout>
  )
}
