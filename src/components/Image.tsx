import React, { CSSProperties, RefObject, useEffect, useRef, useState } from 'react'

import { shakeFalsyItem, shakeUndifindedItem } from '@/functions/arrayMethods'
import mergeRef from '@/functions/react/mergeRef'
import { useClick } from '@/hooks/useClick'

import { getFileNameOfURI } from '../functions/dom/getFileNameOfURI'
import { isArray } from '@/functions/judgers/dateType'

/**
 * usually in the leading part of an list-item
 */
export default function Image({
  width,
  height,

  src,
  fallbackSrc,
  fallbackColor,
  alt: alert,
  onClick,
  domRef,
  className,
  style
}: {
  width?: number
  height?: number
  /** can accept multi srcs */
  src: string | string[] | undefined
  fallbackSrc?: string
  // only when loading and no fallbackSrc
  fallbackColor?: string
  alt?: string // for readability
  onClick?: () => void
  domRef?: RefObject<any>
  className?: string
  style?: CSSProperties
}) {
  const ref = useRef<HTMLImageElement>(null)
  useClick(ref, { onClick })
  const rawSrc = shakeFalsyItem([src].flat())
  const srcSet = rawSrc.length > 0 ? shakeUndifindedItem([src, fallbackSrc].flat()) : []
  const srcFingerprint = srcSet.join(' ')
  const [currentUsedSrcIndex, setCurrentUsedSrcIndex] = useState(0)
  const currentSrc = srcSet[currentUsedSrcIndex] || fallbackSrc
  const alertText = alert ?? getFileNameOfURI(currentSrc ?? '')

  useEffect(() => {
    setCurrentUsedSrcIndex(0)
  }, [srcFingerprint])

  useEffect(() => {
    const handleError = (ev: ErrorEvent): void => {
      setCurrentUsedSrcIndex((n) => n + 1)
    }
    ref.current?.addEventListener('error', handleError)
    return () => {
      ref.current?.removeEventListener('error', handleError)
    }
  }, [])
  return (
    <img
      width={width}
      height={height}
      ref={mergeRef(domRef, ref)}
      className={`Image ${className ?? ''}`}
      src={currentSrc}
      alt={alertText}
      style={{ ...style, backgroundColor: fallbackColor }}
    />
  )
}
