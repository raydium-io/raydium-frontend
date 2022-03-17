import _Link from 'next/link'
import { ReactNode } from 'react'
import { twMerge } from 'tailwind-merge'

import { PageRouteName, routeTo } from '@/application/routeTools'

export default function Link({
  className,
  children,
  href,
  noTextStyle,
  openInNewTab,
  onClick
}: {
  href?: string
  noTextStyle?: boolean
  /** it's a hint. avoid it just use auto detect */
  openInNewTab?: boolean
  className?: string
  children?: ReactNode
  onClick?(): void
}) {
  if (!href) return <span className={className}>{children}</span>

  const _isInnerLink = openInNewTab ? false : href.startsWith('/')
  return _isInnerLink ? (
    <span
      tabIndex={0}
      className={twMerge(
        `Link clickable ${noTextStyle ? '' : 'text-link-color hover:underline underline-offset-1'}`,
        className
      )}
      onClick={() => {
        onClick?.()
        routeTo(href as PageRouteName)
      }}
    >
      {children}
    </span>
  ) : (
    <a
      tabIndex={0}
      rel="nofollow noopener noreferrer"
      target="_blank"
      className={twMerge(
        `Link clickable ${noTextStyle ? '' : 'text-link-color hover:underline underline-offset-1'}`,
        className
      )}
      href={href}
      onClick={onClick}
    >
      {children}
    </a>
  )
}
