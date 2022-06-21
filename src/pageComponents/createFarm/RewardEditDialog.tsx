import useCreateFarms from '@/application/createFarm/useCreateFarm'
import produce from 'immer'
import React, { useRef } from 'react'

import { twMerge } from 'tailwind-merge'

import Card from '../../components/Card'
import Dialog from '../../components/Dialog'
import { RewardCardInputsHandler, RewardFormCardInputs, RewardFormCardInputsParams } from './RewardFormInputs'

export default function RewardInputDialog({
  reward,
  open,
  onClose
}: {
  open: boolean
  onClose(): void
} & RewardFormCardInputsParams) {
  const rewardInputsRef = useRef<RewardCardInputsHandler>()
  return (
    <Dialog
      open={Boolean(open)}
      onClose={() => {
        onClose()
        if (!rewardInputsRef.current?.isValid) {
          useCreateFarms.setState((s) => ({
            rewards: produce(s.rewards, (draft) => {
              const rewardIndex = draft.findIndex((r) => r.id === reward.id)
              if (rewardIndex < 0) return
              draft[rewardIndex] = { ...draft[rewardIndex], ...draft[rewardIndex].originData } // if input not valid cover origin data
            })
          }))
        }
      }}
    >
      <Card
        className={twMerge(
          `p-8 rounded-3xl w-[min(670px,95vw)] mx-8 border-1.5 border-[rgba(171,196,255,0.2)]  bg-cyberpunk-card-bg shadow-cyberpunk-card`
        )}
        size="lg"
      >
        <div className="font-semibold text-xl text-white mb-5">Add more rewards</div>

        {reward.isRwardingBeforeEnd72h && (
          <div className="border border-[rgba(171,196,255,0.2)] rounded-3xl p-6 mb-4">
            <ol className="list-decimal ml-4 space-y-4 font-medium text-[#abc4ff80] text-sm">
              <li>
                You can add additional rewards to the farm 72 hrs prior to rewards ending, but this can only be done if
                rate of rewards for this specific reward token doesn't change.
              </li>
              <li>
                Edit the days or end period and we'll adjust the total amount needed to to be added without effecting
                the rate.
              </li>
              <li>
                If you want to increase or decrease the rewards rate, you must wait until the previous rewards period
                ends before starting a new period and rewards amount.
              </li>
            </ol>
          </div>
        )}
        {<RewardFormCardInputs reward={reward} componentRef={rewardInputsRef} />}
      </Card>
    </Dialog>
  )
}
