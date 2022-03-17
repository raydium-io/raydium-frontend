import React from 'react'
import ReactMarkdown from 'react-markdown'

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
import Link from '../Link'
import useAppSettings from '@/application/appSettings/useAppSettings'

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
        onCloseTransitionEnd={() => {
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
            className="flex flex-col shadow-xl backdrop-filter backdrop-blur-xl p-8 mobile:py-4 w-[min(750px,100vw)] mobile:w-screen max-h-[min(850px,100vh)] mobile:h-screen border-1.5 border-[rgba(171,196,255,0.2)]"
            size="lg"
            style={{
              background:
                'linear-gradient(140.14deg, rgba(0, 182, 191, 0.15) 0%, rgba(27, 22, 89, 0.1) 86.61%), linear-gradient(321.82deg, #18134D 0%, #1B1659 100%)',
              boxShadow: '0px 8px 48px rgba(171, 196, 255, 0.12)'
            }}
          >
            <Row className="justify-between items-center mb-6">
              <div className="text-3xl font-semibold text-white">{currentMessageBoardItem?.title}</div>
              <Icon className="text-[#ABC4FF] cursor-pointer" heroIconName="x" onClick={close} />
            </Row>
            <div className="overflow-y-auto my-4">
              <ReactMarkdown
                className="my-6 whitespace-pre-line mobile:text-sm"
                components={{
                  p: (props) => <p className="text-[#ABC4FF] mobile:text-xs" {...props} />,
                  li: ({ children }) => <li className="pl-2">{children}</li>,
                  ul: ({ children }) => <ul className="pl-6 list-disc">{children}</ul>,
                  h1: ({ children }) => <h1 className="text-white text-2xl font-semibold">{children}</h1>,
                  h2: ({ children }) => <h2 className="text-white text-xl font-semibold">{children}</h2>,
                  h3: ({ children }) => <h3 className="text-white text-lg font-semibold">{children}</h3>,
                  a: ({ children, href }) => <Link href={href}>{children}</Link>,
                  strong: ({ children }) => <span className="font-bold ">{children}</span>,
                  em: ({ children }) => <span className="italic text-base">{children}</span>
                }}
              >
                {currentMessageBoardItem?.details ?? ''}
              </ReactMarkdown>
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
