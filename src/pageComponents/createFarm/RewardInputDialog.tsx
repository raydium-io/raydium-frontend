import React from 'react'

import { twMerge } from 'tailwind-merge'

import Card from '../../components/Card'
import Dialog from '../../components/Dialog'
import { RewardFormCardInputs, RewardFormCardInputsParams } from './RewardFormCardInputs'

export default function RewardEditInputDialog({
  open,
  onClose,
  ...rewardFormCardInputsParams
}: {
  open: boolean
  onClose(): void
} & RewardFormCardInputsParams) {
  return (
    <Dialog open={Boolean(open)} onClose={onClose}>
      <Card
        className={twMerge(
          `p-8 rounded-3xl w-[min(670px,95vw)] mx-8 border-1.5 border-[rgba(171,196,255,0.2)]  bg-cyberpunk-card-bg shadow-cyberpunk-card`
        )}
        size="lg"
      >
        <div className="font-semibold text-xl text-white mb-5">Add more rewards</div>

        <div className="border border-[rgba(171,196,255,0.2)] rounded-3xl p-6 mb-4">
          <ol className="list-decimal ml-4 space-y-4 font-medium text-[#abc4ff80] text-sm">
            <li>
              You can add additional rewards to the farm 24 hrs prior to rewards ending, but this can only be done if
              rate of rewards for this specific reward token doesn't change.
            </li>
            <li>
              Edit the days or end period and we'll adjust the total amount needed to to be added without effecting the
              rate.
            </li>
            <li>
              If you want to increase or decrease the rewards rate, you must wait until the previous rewards period ends
              before starting a new period and rewards amount.
            </li>
          </ol>
        </div>
        {<RewardFormCardInputs {...rewardFormCardInputsParams} />}
      </Card>
    </Dialog>
  )
}
