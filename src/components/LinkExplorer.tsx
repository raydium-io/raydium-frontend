import { ReactNode, useMemo } from 'react'

import useAppSettings, { ExplorerName } from '@/application/appSettings/useAppSettings'

import Link from './Link'

export enum ExplorerLinkType {
  TOKEN = 'token',
  ACCOUNT = 'account'
}

export default function LinkExplorer({
  className,
  children,
  hrefDetail,
  type,
  noTextStyle,
  ...restProps
}: {
  className?: string
  children?: ReactNode
  hrefDetail?: string
  type?: 'token' | 'account'
  noTextStyle?: boolean
}) {
  const explorerName = useAppSettings((s) => s.explorerName)
  const explorerUrl = useAppSettings((s) => s.explorerUrl)

  const prefix = useMemo(() => {
    switch (type) {
      case ExplorerLinkType.TOKEN:
        if (explorerName === ExplorerName.SOLSCAN) {
          return 'token/'
        }
        return 'address/'
      case ExplorerLinkType.ACCOUNT:
        if (explorerName === ExplorerName.SOLSCAN) {
          return 'account/'
        }
        return 'address/'
      default:
        return ''
    }
  }, [])

  return (
    <Link
      className={className}
      href={explorerUrl + prefix + hrefDetail}
      openInNewTab={true}
      noTextStyle={noTextStyle}
      {...restProps}
    >
      {children}
    </Link>
  )
}
