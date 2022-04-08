import React from 'react'
import ReactMarkdown from 'react-markdown'
import Link from './Link'
import { ReactMarkdownOptions } from 'react-markdown/lib/react-markdown'

/**
 * re-wrap `<ReactMarkdown>`
 */
export function Markdown({
  className,
  children = '',
  component
}: {
  className?: string
  children?: string
  component?: ReactMarkdownOptions['components']
}) {
  return (
    <ReactMarkdown
      className={className}
      components={{
        p: (props) => <p className="text-[#ABC4FF] mobile:text-xs text-justify py-2" {...props} />,
        li: ({ children }) => <li className="pl-2">{children}</li>,
        ul: ({ children }) => <ul className="pl-6 list-disc">{children}</ul>,
        h1: ({ children }) => <h1 className="text-white text-2xl font-semibold">{children}</h1>,
        h2: ({ children }) => <h2 className="text-white text-xl font-semibold">{children}</h2>,
        h3: ({ children }) => <h3 className="text-white text-lg font-semibold">{children}</h3>,
        a: ({ children, href }) => <Link href={href}>{children}</Link>,
        strong: ({ children }) => <span className="font-bold ">{children}</span>,
        em: ({ children }) => <span className="italic text-base">{children}</span>,
        ...component
      }}
    >
      {children}
    </ReactMarkdown>
  )
}
