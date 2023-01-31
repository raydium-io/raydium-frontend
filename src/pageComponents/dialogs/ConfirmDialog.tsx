import React, { ReactNode, RefObject, useCallback, useRef } from 'react'

import { twMerge } from 'tailwind-merge'

import useToggle from '@/hooks/useToggle'

import Button from '../../components/Button'
import Card from '../../components/Card'
import Col from '../../components/Col'
import Dialog from '../../components/Dialog'
import Icon, { AppHeroIconName } from '../../components/Icon'

export interface ConfirmDialogInfo {
  cardWidth?: 'md' | 'lg'

  type?: 'success' | 'warning' | 'error' | 'info' | 'no-head-icon'
  title?: ReactNode
  subtitle?: ReactNode
  description?: ReactNode

  additionalContent?: ReactNode
  onlyConfirmButton?: boolean

  /** Defaultly cancel button is main button */
  confirmButtonIsMainButton?: boolean
  confirmButtonText?: ReactNode
  cancelButtonText?: ReactNode
  onCancel?(): void
  onConfirm?(): void
}

const colors: Record<
  Exclude<ConfirmDialogInfo['type'], 'no-head-icon'> & string,
  { heroIconName: AppHeroIconName; ring: string; bg: string; text: string }
> = {
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

export default function ConfirmDialog(props: ConfirmDialogInfo & { domRef?: RefObject<HTMLDivElement> }) {
  const [isOpen, { off: _close }] = useToggle(true)
  const hasConfirmed = useRef(false)

  const confirm = useCallback(() => {
    props.onConfirm?.()
    hasConfirmed.current = true
    _close()
  }, [_close])

  const close = useCallback(() => {
    _close()
    if (!hasConfirmed.current) props.onCancel?.()
  }, [_close])

  return (
    <Dialog open={isOpen} onClose={close}>
      {({ close: closeDialog }) => (
        <Card
          className={twMerge(
            `p-8 rounded-3xl ${
              props.cardWidth === 'lg' ? 'w-[min(560px,95vw)]' : 'w-[min(360px,80vw)]'
            }  mx-8 border-1.5 border-[rgba(171,196,255,0.2)] bg-cyberpunk-card-bg shadow-cyberpunk-card`
          )}
          size="lg"
        >
          <Col className="items-center">
            {props.type !== 'no-head-icon' && (
              <Icon
                size="lg"
                heroIconName={colors[props.type ?? 'info'].heroIconName}
                className={`${colors[props.type ?? 'info'].text} mb-3`}
              />
            )}

            <div className="mb-6 text-center">
              <div className="font-semibold text-xl text-white mb-3">{props.title}</div>
              {props.subtitle && <div className="font-semibold text-xl text-white">{props.subtitle}</div>}
              {props.description && <div className="font-normal text-base text-[#ABC4FF]">{props.description}</div>}
            </div>

            <div className="self-stretch">
              {props.additionalContent}
              <Col>
                {!props.onlyConfirmButton && (
                  <Button
                    className="text-[#ABC4FF] frosted-glass-skygray"
                    onClick={props.confirmButtonIsMainButton ? confirm : close}
                  >
                    {props.confirmButtonIsMainButton
                      ? props.confirmButtonText ?? 'OK'
                      : props.cancelButtonText ?? 'Cancel'}
                  </Button>
                )}
                <Button
                  className={`text-[#ABC4FF] ${props.onlyConfirmButton ? 'frosted-glass-skygray' : ''} text-sm ${
                    !props.onlyConfirmButton ? '-mb-4' : ''
                  }`}
                  type="text"
                  onClick={props.confirmButtonIsMainButton ? close : confirm}
                >
                  {props.confirmButtonIsMainButton
                    ? props.cancelButtonText ?? 'Cancel'
                    : props.confirmButtonText ?? 'OK'}
                </Button>
              </Col>
            </div>
          </Col>
        </Card>
      )}
    </Dialog>
  )
}
