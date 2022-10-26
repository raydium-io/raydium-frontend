import useAppSettings from '@/application/common/useAppSettings'
import { useHover } from '@/hooks/useHover'
import { useSignalState } from '@/hooks/useSignalState'
import useToggle from '@/hooks/useToggle'
import produce from 'immer'
import { RefObject, useEffect, useImperativeHandle, useRef, useState } from 'react'
import Card from '../Card'
import Col from '../Col'
import Icon from '../Icon'
import LinkExplorer from '../LinkExplorer'
import LoadingCircleSmall from '../LoadingCircleSmall'
import Row from '../Row'
import { TxNotificationController, TxNotificationItemInfo } from './type'
import { spawnTimeoutControllers } from './utils'

const existMs = process.env.NODE_ENV === 'development' ? 1 * 60 * 1000 : 1 * 60 * 1000 // (ms)

const colors = {
  success: {
    heroIconName: 'check-circle',
    ring: 'ring-[#39d0d8]',
    text: 'text-[#39d0d8]',
    bg: 'bg-[#39d0d8]'
  },
  error: {
    heroIconName: 'exclamation-circle',
    ring: 'ring-[#DA2EEF]',
    text: 'text-[#DA2EEF]',
    bg: 'bg-[#e54bf9]'
  },
  info: {
    heroIconName: 'information-circle',
    ring: 'ring-[#2e7cf8]',
    text: 'text-[#2e7cf8]',
    bg: 'bg-[#92bcff]'
  },
  warning: {
    heroIconName: 'exclamation',
    ring: 'ring-[#D8CB39]',
    text: 'text-[#D8CB39]',
    bg: 'bg-[#D8CB39]'
  }
}

export function TxNotificationItemCard({
  info: { txInfos },
  componentRef,
  close
}: {
  componentRef: RefObject<any>
  info: TxNotificationItemInfo
  close: () => void
}) {
  const isMobile = useAppSettings((s) => s.isMobile)
  const explorerName = useAppSettings((s) => s.explorerName)
  // cache for componentRef to change it
  const [innerTxInfos, setInnerTxInfos, innerTxInfosSignal] = useSignalState(txInfos)
  const [, setTxAllProcessed, txAllProcessedSignal] = useSignalState(false)
  useEffect(() => {
    const txAllProcessed = innerTxInfos.every(({ state }) => state && state !== 'processing' && state !== 'queuing')
    if (txAllProcessed) {
      setTxAllProcessed(txAllProcessed)
      timeoutController.current.start()
      resumeTimeline()
    }
  }, [innerTxInfos])

  const [isTimePassing, { off: pauseTimeline, on: resumeTimeline }] = useToggle(false)

  const timeoutController = useRef(
    spawnTimeoutControllers({
      onEnd: close,
      totalDuration: existMs
    })
  )

  const itemRef = useRef<HTMLDivElement>(null)

  useHover(itemRef, {
    onHover({ is: now }) {
      if (!txAllProcessedSignal()) return
      if (now === 'start') {
        timeoutController.current.pause()
        pauseTimeline()
      } else {
        timeoutController.current.resume()
        resumeTimeline()
      }
    }
  })

  useImperativeHandle(
    componentRef,
    () =>
      ({
        changeItemInfo(newInfo, { transaction: targetTransaction }) {
          const mutated = produce(innerTxInfosSignal(), (txInfos) => {
            const targetIdx = txInfos.findIndex(
              ({ transaction: candidateTransaction }) => candidateTransaction === targetTransaction
            )
            if (targetIdx < 0) {
              throw 'cannot get correct idx'
            }
            txInfos[targetIdx] = { ...txInfos[targetIdx], ...newInfo }
          })
          setInnerTxInfos(mutated)
        }
      } as TxNotificationController)
  )

  const wholeItemState = innerTxInfos.every(({ state }) => state === 'success')
    ? 'success'
    : innerTxInfos.some(({ state }) => state === 'error')
    ? 'error'
    : 'info'
  return (
    <Card
      domRef={itemRef}
      className={`min-w-[260px] relative rounded-xl ring-1.5 ring-inset ${colors[wholeItemState].ring} bg-[#1B1659] py-4 pl-5 pr-10 mx-4 my-2 overflow-hidden pointer-events-auto transition`}
    >
      {/* timeline */}
      <div className="h-1 absolute top-0 left-0 right-0">
        {/* track */}
        <div className={`opacity-5 ${colors[wholeItemState].bg} absolute inset-0 transition`} />
        {/* remain-line */}
        <div
          className={`${colors[wholeItemState].bg} absolute inset-0`}
          style={{
            animation: `shrink ${existMs}ms linear forwards`,
            animationPlayState: isTimePassing ? 'running' : 'paused'
          }}
        />
      </div>

      <Icon
        size="sm"
        heroIconName="x"
        className="absolute right-3 top-3 clickable text-[rgba(171,196,255,0.5)]"
        onClick={() => {
          timeoutController.current.cancel()
          close()
        }}
      />
      <Row className="gap-3 px-2 mobile:px-0">
        <div>
          <div className="mb-2">
            <div className="font-medium text-lg  mobile:p-0 mobile:text-sm text-white">
              {innerTxInfos[0].historyInfo.title}
            </div>
            <div className="font-medium text-sm mobile:text-sm text-[rgba(171,196,255,0.5)]">
              {innerTxInfos[0].historyInfo.description}
            </div>
          </div>
          <Col className="gap-3 mobile:gap-2">
            {innerTxInfos.map(({ state, txid }, idx) => (
              <Row key={idx} className="items-center gap-2 mobile:gap-1">
                <div>
                  {state === 'processing' ? (
                    <LoadingCircleSmall className="h-6 w-6 mobile:h-4 mobile:w-4 scale-75" />
                  ) : state === 'success' ? (
                    <Icon heroIconName="check-circle" size={isMobile ? 'sm' : 'md'} className="text-[#39d0d8]" />
                  ) : state === 'error' ? (
                    <Icon heroIconName="exclamation-circle" size={isMobile ? 'sm' : 'md'} className="text-[#DA2EEF]" />
                  ) : (
                    <div className="h-6 w-6 mobile:h-4 mobile:w-4"></div>
                  )}
                </div>

                <Row className="text-sm mobile:text-xs text-[#abc4ff80] gap-2">
                  {innerTxInfos.length > 1 ? (
                    <>
                      <div>Step {idx + 1}</div>
                      {txid && (
                        <>
                          <div className="opacity-50">{'|'}</div>
                          <div>
                            View on <LinkExplorer hrefDetail={`tx/${txid}`}>{explorerName}</LinkExplorer>
                          </div>
                        </>
                      )}
                    </>
                  ) : (
                    <div>
                      View on <LinkExplorer hrefDetail={`tx/${txid}`}>{explorerName}</LinkExplorer>
                    </div>
                  )}
                </Row>
              </Row>
            ))}
          </Col>
        </div>
      </Row>
    </Card>
  )
}
