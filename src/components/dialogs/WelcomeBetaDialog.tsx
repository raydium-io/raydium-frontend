import React, * as react from 'react'

import { twMerge } from 'tailwind-merge'

import useToggle from '@/hooks/useToggle'

import Button from '../Button'
import Card from '../Card'
import Col from '../Col'
import Dialog from '../Dialog'
import Icon, { AppHeroIconName } from '../Icon'

export default function WelcomeBetaDialog(props: { content: react.ReactNode; onConfirm?: () => void }) {
  const [isOpen, { off: _close }] = useToggle(true)
  const hasConfirmed = react.useRef(false)

  const confirm = react.useCallback(() => {
    props.onConfirm?.()
    hasConfirmed.current = true
    _close()
  }, [_close])

  const close = react.useCallback(() => {
    _close()
  }, [_close])

  return (
    <Dialog open={isOpen} onClose={close}>
      <Card
        className={twMerge(`p-8 rounded-3xl w-[min(480px,95vw)] mx-8 border-1.5 border-[rgba(171,196,255,0.2)]`)}
        size="lg"
        style={{
          background:
            'linear-gradient(140.14deg, rgba(0, 182, 191, 0.15) 0%, rgba(27, 22, 89, 0.1) 86.61%), linear-gradient(321.82deg, #18134D 0%, #1B1659 100%)',
          boxShadow: '0px 8px 48px rgba(171, 196, 255, 0.12)'
        }}
      >
        <Col className="items-center">
          {props.content}

          <div className="self-stretch">
            <Col>
              <Button className={`frosted-glass-teal`} onClick={confirm}>
                OK
              </Button>
            </Col>
          </div>
        </Col>
      </Card>
    </Dialog>
  )
}
