import React, { CSSProperties, RefObject } from 'react'

import { twMerge } from 'tailwind-merge'

import { SplToken, Token } from '@/application/token/type'

import Image from './Image'
import Row from './Row'

export interface CoinAvatarProps {
  /** the shadow transparent fondation border */
  noCoinIconBorder?: boolean
  haveAnime?: boolean
  /** this is a prop for faster develop */
  iconSrc?: string
  /** this can be used replace prop: `iconSrc` */
  /** if not specific it will show a default  dollar icon  */
  token?: Token | SplToken
  isOptionToken?: boolean
  // basic
  domRef?: RefObject<any>
  className?: string
  /** sx: 16px | sm: 20px | smi: 24px | md: 32px | lg: 48px | 2xl: 80px | (default: md) */
  size?: 'xs' | 'sm' | 'smi' | 'md' | 'lg' | '2xl'
  style?: CSSProperties
  isRewardBadge?: boolean
  isRewardEnd?: boolean
  onClick?(): void
}

export default function CoinAvatar({
  noCoinIconBorder,
  haveAnime,

  iconSrc,
  token,
  isOptionToken,

  domRef,
  className,
  size = 'md',
  style,
  isRewardBadge,
  isRewardEnd,
  onClick
}: CoinAvatarProps) {
  // if (!token && !iconSrc) return null
  const src = iconSrc ?? ((token && 'icon' in token && token?.icon) || undefined)
  const hasOpacity = !noCoinIconBorder
  const iconSize =
    size === '2xl'
      ? 'h-20 w-20'
      : size === 'lg'
      ? 'h-12 w-12'
      : size === 'md'
      ? 'h-8 w-8'
      : size === 'sm'
      ? 'h-5 w-5'
      : size === 'smi'
      ? 'h-6 w-6'
      : size === 'xs'
      ? 'w-4 h-4'
      : 'h-12 w-12'

  return (
    <>
      {isRewardEnd && (
        <Image
          className={`h-8 w-8 rounded-full overflow-hidden `}
          src="/icons/diagonal.svg"
          fallbackSrc="/coins/unknown.svg"
          style={{ position: 'absolute', zIndex: 100, opacity: 20 }}
        />
      )}

      <div
        ref={domRef}
        className={`CoinAvatar flex items-center  ${isRewardBadge ? 'rounded-full ring-1 ring-[#616A9D] p-1' : ''} ${
          isRewardEnd ? 'opacity-30 ring-[#7B7EAF]' : ''
        } `}
        style={style}
        onClick={onClick}
      >
        {!haveAnime ? (
          <div
            className={twMerge(`${iconSize} relative rounded-full`, className)}
            style={{
              background: 'linear-gradient(126.6deg, rgba(171, 196, 255, 0.2) 28.69%, rgba(171, 196, 255, 0) 100%)'
            }}
          >
            <Image
              className={`${iconSize} rounded-full overflow-hidden transition-transform transform ${
                hasOpacity ? 'scale-[.7]' : ''
              }`}
              src={src}
              fallbackSrc="/coins/unknown.svg"
            />
            {false && (
              <Row className="items-center justify-center absolute top-0 left-[calc(100%-6px)] rounded-full bg-[#abc4ff]">
                <div
                  className="text-[6px] text-[#1B1659] top-0 left-[calc(100%-6px)] rounded-full bg-[#abc4ff]"
                  style={{}}
                >
                  opt
                </div>
              </Row>
            )}
          </div>
        ) : (
          <div
            className={twMerge(`${iconSize} rounded-full swap-coin`, className)}
            suppressHydrationWarning // @see https://reactjs.org/docs/react-dom.html#hydrate
            style={{ ['--delay' as string]: `${(Math.random() * 1000).toFixed(2)}ms` }}
          >
            <Image
              className={`front-face overflow-hidden transition-transform transform ${hasOpacity ? 'scale-[.7]' : ''}`}
              src={src}
              fallbackSrc="/coins/unknown.svg"
            />
            <div className="line-group">
              <div className="line-out">
                <div className="line-inner"></div>
              </div>
              <div className="line-out">
                <div className="line-inner"></div>
              </div>
              <div className="line-out">
                <div className="line-inner"></div>
              </div>
              <div className="line-out">
                <div className="line-inner"></div>
              </div>
              <div className="line-out">
                <div className="line-inner"></div>
              </div>
              <div className="line-out">
                <div className="line-inner"></div>
              </div>
              <div className="line-out">
                <div className="line-inner"></div>
              </div>
              <div className="line-out">
                <div className="line-inner"></div>
              </div>
              <div className="line-out">
                <div className="line-inner"></div>
              </div>
              <div className="line-out">
                <div className="line-inner"></div>
              </div>
              <div className="line-out">
                <div className="line-inner"></div>
              </div>
              <div className="line-out">
                <div className="line-inner"></div>
              </div>
            </div>
            <Image
              className={`back-face overflow-hidden transition-transform transform ${hasOpacity ? 'scale-[.7]' : ''}`}
              src={src}
              fallbackSrc="/coins/unknown.svg"
            />
          </div>
        )}
      </div>
    </>
  )
}
