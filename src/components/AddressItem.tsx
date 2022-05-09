import copyToClipboard from '@/functions/dom/copyToClipboard'
import toPubString from '@/functions/format/toMintString'
import useToggle from '@/hooks/useToggle'
import { PublicKeyish } from '@raydium-io/raydium-sdk'
import React, { useEffect } from 'react'
import Icon from './Icon'
import { ThreeSlotItem } from './ThreeSlotItem'

/**
 * base on {@link ThreeSlotItem}
 */
export function AddressItem({
  className,
  children: publicKey,
  showDigitCount = 4
}: {
  className?: string
  children: PublicKeyish | undefined
  showDigitCount?: number
}) {
  const [isCopied, { delayOff, on }] = useToggle()

  useEffect(() => {
    if (isCopied) delayOff()
  }, [isCopied])

  if (!publicKey) return null
  return (
    <ThreeSlotItem
      className={className}
      text={
        isCopied ? (
          <div>copied</div>
        ) : (
          <div title={toPubString(publicKey)}>
            {toPubString(publicKey).slice(0, showDigitCount)}...{String(publicKey).slice(-1 * showDigitCount)}
          </div>
        )
      }
      suffix={!isCopied && <Icon size="sm" className="clickable text-[#ABC4FF] ml-3" heroIconName="clipboard-copy" />}
      onClick={() => {
        if (!isCopied) copyToClipboard(toPubString(publicKey)).then(on)
      }}
    />
  )
}
