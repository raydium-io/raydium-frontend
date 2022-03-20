import { ReactNode } from 'react'

import { shrinkToValue } from '@/functions/shrinkToValue'

import Col from './Col'
import Row from './Row'

/** must set either totalSteps or stepInfos */
export default function SetpIndicator<T extends { /** start from 1  */ stepNumber: number; stepContent: ReactNode }>({
  currentStep = 1,
  stepInfos,
  onSetCurrentSetp,
  renderStepContent,
  renderStepLine,
  renderStepNumber
}: {
  defaultStep?: number
  currentStep?: number
  stepInfos: T[]
  onSetCurrentSetp?: (info: T) => void
  renderStepNumber?: ((info: T) => ReactNode) | ReactNode // just data container shouldn't render data body here, please use `stepInfos`
  renderStepLine?: ((info: T & { isLast?: boolean }) => ReactNode) | ReactNode // just data container shouldn't render data body here, please use `stepInfos`
  renderStepContent?: ((info: T) => ReactNode) | ReactNode // just data container shouldn't render data body here, please use `stepInfos`
}) {
  return (
    <div>
      {stepInfos.map((info, index, arrs) => (
        <Row key={index}>
          {/* bubble */}
          <Col className="items-center">
            {shrinkToValue(renderStepNumber, [info]) || (
              <div
                className={`grid place-items-center h-8 w-8 mobile:h-6 mobile:w-6 text-sm font-medium bg-[#141041] rounded-full ${
                  currentStep === info.stepNumber ? 'text-[#F1F1F2]' : 'text-[rgba(171,196,255,.5)]'
                } ${currentStep > info.stepNumber ? 'clickable' : ''}`}
                onClick={() => {
                  currentStep > info.stepNumber && onSetCurrentSetp?.(info)
                }}
              >
                {info.stepNumber}
              </div>
            )}
            {shrinkToValue(renderStepLine, [Object.assign(info, { isLast: index === arrs.length - 1 })]) ||
              (index !== arrs.length - 1 && (
                <div className="my-2 min-h-[16px] mobile:h-2 border-r-1.5 border-[rgba(171,196,255,.5)] flex-1"></div>
              ))}
          </Col>
          <div className="ml-2">
            {shrinkToValue(renderStepContent, [info]) || (
              <div
                className={`text-sm font-medium ${
                  currentStep === info.stepNumber ? 'text-[#F1F1F2]' : 'text-[rgba(171,196,255,.5)]'
                } pt-1.5`}
              >
                {info.stepContent}
              </div>
            )}
          </div>
        </Row>
      ))}
    </div>
  )
}
