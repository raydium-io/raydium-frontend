import copyToClipboard from '@/functions/dom/copyToClipboard'
import toPubString from '@/functions/format/toMintString'
import useToggle from '@/hooks/useToggle'
import { PublicKeyish } from '@raydium-io/raydium-sdk'
import React, { useEffect } from 'react'
import { twMerge } from 'tailwind-merge'
import Icon from './Icon'
import { ThreeSlotItem } from './ThreeSlotItem'

/**
 * base on {@link ThreeSlotItem}
 */
export function AddressItem({
  canCopy = true,
  className,
  textClassName,
  iconClassName,
  children: publicKey,
  showDigitCount = 4
}: {
  canCopy?: boolean
  className?: string
  textClassName?: string
  iconClassName?: string
  children: PublicKeyish | undefined
  showDigitCount?: number | 'all'
}) {
  const [isCopied, { delayOff, on }] = useToggle(false, { delay: 400 })

  useEffect(() => {
    if (isCopied) delayOff()
  }, [isCopied])

  if (!publicKey) return null
  return (
    <ThreeSlotItem
      className={className}
      textClassName={textClassName}
      text={
        <div title={toPubString(publicKey)} className="relative">
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
        canCopy ? (
          <Icon
            size="sm"
            className={twMerge('clickable text-[#ABC4FF] ml-3', iconClassName)}
            heroIconName="clipboard-copy"
          />
        ) : null
      }
      onClick={(ev) => {
        if (canCopy) {
          ev.stopPropagation()
          if (!isCopied) copyToClipboard(toPubString(publicKey)).then(on)
        }
      }}
    />
  )
}
