import React, { ReactNode } from 'react'

import { MessageBoardItem } from '@/application/messageBoard/type'
import useMessageBoard from '@/application/messageBoard/useMessageBoard'
import { isExist } from '@/functions/judgers/nil'

import Button from '../Button'
import Card from '../Card'
import Col from '../Col'
import Icon from '../Icon'
import PageLayoutPopoverDrawer from '../PageLayoutPopoverDrawer'
import ResponsiveDialogDrawer from '../ResponsiveDialogDrawer'
import Row from '../Row'
import linkTo from '@/functions/dom/linkTo'
import useAppSettings from '@/application/appSettings/useAppSettings'
import { Markdown } from '../Markdown'

/**
 * pure appearance component
 */
function MessageItem({
  messageBoardItem: item,
  haveReaded,
  onClick
}: {
  messageBoardItem: MessageBoardItem
  haveReaded?: boolean
  onClick?: () => void
}) {
  return (
    <Col
      className="py-4 border-[rgba(171,196,255,0.2)] cursor-pointer clickable clickable-filter-effect"
      onClick={onClick}
    >
      <Row className="gap-4 items-center">
        <div className={`text-[#ABC4FF] ${haveReaded ? 'opacity-40' : 'opacity-80'} font-semibold`}>{item.title}</div>
        <Icon
          size="sm"
          className={`text-[#ABC4FF] ${haveReaded ? 'opacity-40' : 'hidden'}`}
          heroIconName="check-circle"
        />
      </Row>
      <div className={`text-[rgb(171,196,255)] ${haveReaded ? 'opacity-40' : 'opacity-80'} text-xs`}>
        {item.summary}
      </div>
    </Col>
  )
}

/** this should be used in ./Navbar.tsx */
/** Currently unused in favour of Dialect notification center **/
export default function MessageBoardWidget() {
  const readedIds = useMessageBoard((s) => s.readedIds)
  const messageBoardItems = useMessageBoard((s) => s.messageBoardItems)
  const currentMessageBoardItem = useMessageBoard((s) => s.currentMessageBoardItem)
  const isMobile = useAppSettings((s) => s.isMobile)

  return (
    <>
      <PageLayoutPopoverDrawer
        alwaysPopper
        popupPlacement="bottom-right"
        renderPopoverContent={({ close: closePanel }) => (
          <div>
            <div className="pt-3 -mb-1 mobile:mb-2 px-6 text-[rgba(171,196,255,0.5)] text-xs mobile:text-sm">
              Raydium Message Board
            </div>
            <div className="gap-3 divide-y-1.5 p-4">
              {messageBoardItems.map((item) => (
                <MessageItem
                  key={item.title + item.updatedAt}
                  haveReaded={readedIds.has(item.id)}
                  messageBoardItem={item}
                  onClick={() => {
                    closePanel()
                    useMessageBoard.setState({ currentMessageBoardItem: item })
                  }}
                />
              ))}
            </div>
          </div>
        )}
      >
        <Icon
          size={isMobile ? 'smi' : 'md'}
          heroIconName="bell"
          className="text-[#ABC4FF] opacity-60 hover:opacity-75 clickable clickable-filter-effect clickable-mask-offset-3"
        />
      </PageLayoutPopoverDrawer>
      <ResponsiveDialogDrawer
        open={isExist(currentMessageBoardItem)}
        onClose={() => {
          if (currentMessageBoardItem?.id) {
            useMessageBoard.setState((s) => ({
              readedIds: new Set(s.readedIds.add(currentMessageBoardItem.id))
            }))
          }
          useMessageBoard.setState({ currentMessageBoardItem: null })
        }}
      >
        {({ close }) => (
          <Card
            className="flex flex-col backdrop-filter backdrop-blur-xl p-8 mobile:py-4 w-[min(750px,100vw)] mobile:w-screen max-h-[min(850px,100vh)] mobile:h-screen border-1.5 border-[rgba(171,196,255,0.2)] bg-cyberpunk-card-bg shadow-cyberpunk-card"
            size="lg"
          >
            <Row className="justify-between items-center mb-6">
              <div className="text-3xl font-semibold text-white">{currentMessageBoardItem?.title}</div>
              <Icon className="text-[#ABC4FF] cursor-pointer" heroIconName="x" onClick={close} />
            </Row>
            <div className="overflow-y-auto my-4">
              <Markdown className="my-6 whitespace-pre-line mobile:text-sm">
                {currentMessageBoardItem?.details ?? ''}
              </Markdown>
            </div>

            <Button className="frosted-glass-teal" onClick={close}>
              Mark as Read
            </Button>
          </Card>
        )}
      </ResponsiveDialogDrawer>
    </>
  )
}
