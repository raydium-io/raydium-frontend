import { useHover } from '@/hooks/useHover'
import { useSignalState } from '@/hooks/useSignalState'
import useToggle from '@/hooks/useToggle'
import produce from 'immer'
import { RefObject, useEffect, useImperativeHandle, useRef, useState } from 'react'
import Card from '../Card'
import Icon from '../Icon'
import LinkExplorer from '../LinkExplorer'
import LoadingCircleSmall from '../LoadingCircleSmall'
import Row from '../Row'
import { TxNotificationController, TxNotificationItemInfo } from './type'
import { spawnTimeoutControllers } from './utils'

const existMs = process.env.NODE_ENV === 'development' ? 10 * 60 * 1000 : 2 * 60 * 1000 // (ms)

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
  // cache for componentRef to change it
  const [innerTxInfos, setInnerTxInfos, innerTxInfosSignal] = useSignalState(txInfos)

  const [txAllProcessed, setTxAllProcessed, txAllProcessedSignal] = useSignalState(false)
  const [isTimePassing, { off: pauseTimeline, on: resumeTimeline }] = useToggle(false)

  const timeoutController = useRef(
    spawnTimeoutControllers({
      onEnd: close,
      totalDuration: existMs
    })
  )

  const itemRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (txAllProcessed) {
      timeoutController.current.start()
      resumeTimeline()
    }
  }, [txAllProcessed])

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

  useEffect(() => {
    const txAllProcessed = txInfos.every(({ state }) => state && state !== 'processing' && state !== 'queuing')
    if (txAllProcessed) timeoutController.current.start()
  }, [txInfos])

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

  return (
    <Card
      domRef={itemRef}
      className={`min-w-[260px] relative rounded-xl ring-1.5 ring-inset ${colors['success'].ring} bg-[#1B1659] py-4 pl-5 pr-10 mx-4 my-2 overflow-hidden pointer-events-auto`}
    >
      {/* timeline */}
      <div className="h-1 absolute top-0 left-0 right-0">
        {/* track */}
        <div className={`opacity-5 ${colors['success'].bg} absolute inset-0`} />
        {/* remain-line */}
        <div
          className={`${colors['success'].bg} absolute inset-0`}
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
      {/* <Icon
           heroIconName="x"
           onClick={close}
           className="rounded-full absolute top-3 right-1 h-5 w-5 text-secondary cursor-pointer"
          /> */}
      <Row className="gap-3">
        <div>
          <div className="font-medium text-base mobile:text-sm text-white">{innerTxInfos[0].historyInfo.title}</div>
          {innerTxInfos.map(({ historyInfo, state, txid }, idx) => (
            <div key={idx}>
              <Row className="items-center">
                <div className="h-8 w-8 flex-none">
                  {state === 'processing' ? (
                    <LoadingCircleSmall />
                  ) : state === 'success' ? (
                    <Icon heroIconName="check-circle" className="text-[#39d0d8]" />
                  ) : state === 'error' ? (
                    <Icon heroIconName="exclamation-circle" className="text-[#DA2EEF]" />
                  ) : null}
                </div>
                {txid ? <LinkExplorer hrefDetail={`tx/${txid}`}>Step {idx}</LinkExplorer> : <div>Step {idx}</div>}
              </Row>
              <div className="font-medium text-sm mobile:text-xs text-[rgba(171,196,255,0.5)]">
                {historyInfo.description}
              </div>
            </div>
          ))}
        </div>
      </Row>
    </Card>
  )
}
