import React, { useEffect } from 'react'

import { PublicKeyish } from 'test-r-sdk'

import { twMerge } from 'tailwind-merge'

import copyToClipboard from '@/functions/dom/copyToClipboard'
import toPubString from '@/functions/format/toMintString'
import useToggle from '@/hooks/useToggle'
import { AnyFn } from '@/types/constants'

import Icon from './Icon'
import Link from './Link'
import LinkExplorer from './LinkExplorer'
import Row from './Row'
import { RowItem } from './RowItem'

/**
 * base on {@link RowItem}
 */
export function AddressItem({
  canCopy = true,
  canExternalLink = false,
  className,
  textClassName,
  iconClassName,
  children: publicKey,
  showDigitCount = 6,
  addressType = 'account',
  onCopied
}: {
  canCopy?: boolean
  canExternalLink?: boolean
  className?: string
  textClassName?: string
  iconClassName?: string
  children: PublicKeyish | undefined
  showDigitCount?: number | 'all'
  addressType?: 'token' | 'account'
  onCopied?(text: string): void // TODO: imply it
}) {
  const [isCopied, { delayOff, on }] = useToggle(false, { delay: 400 })

  useEffect(() => {
    if (isCopied) delayOff()
  }, [isCopied])

  const handleClickCopy = (ev: { stopPropagation: AnyFn }) => {
    ev.stopPropagation()
    if (!isCopied) copyToClipboard(toPubString(publicKey)).then(on)
  }

  if (!publicKey) return null
  return (
    <RowItem
      className={className}
      textClassName={textClassName}
      text={
        <div title={toPubString(publicKey)} className="relative" onClick={(ev) => canCopy && handleClickCopy(ev)}>
          <div className={`${isCopied ? 'opacity-10' : 'opacity-100'} transition`}>
            {showDigitCount === 'all'
              ? `${toPubString(publicKey)}`
              : `${toPubString(publicKey).slice(0, showDigitCount)}...${toPubString(publicKey).slice(
                  -1 * showDigitCount
                )}`}
          </div>
          <div
            className={`absolute inset-0 ${
              isCopied ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
            } transition flex items-center justify-center`}
          >
            Copied
          </div>
        </div>
      }
      suffix={
        canCopy || canExternalLink ? (
          <Row className="gap-1 ml-3">
            {canCopy ? (
              <Icon
                size="sm"
                className={twMerge('clickable text-[#ABC4FF]', iconClassName)}
                heroIconName="clipboard-copy"
                onClick={({ ev }) => handleClickCopy(ev)}
              />
            ) : null}
            {canExternalLink ? (
              <LinkExplorer hrefDetail={`${publicKey}`} type={addressType}>
                <Icon size="sm" heroIconName="external-link" className="clickable text-[#abc4ff]" />
              </LinkExplorer>
            ) : null}
          </Row>
        ) : null
      }
    />
  )
}
