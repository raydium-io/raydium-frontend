import React from 'react'
import { twMerge } from 'tailwind-merge'

import { SplToken } from '@/application/token/type'
import CoinAvatar, { CoinAvatarProps } from '@/components/CoinAvatar'
import Row from '@/components/Row'

export default function CoinAvatarPair({
  token1,
  token2,
  size,
  className,

  CoinAvatar1,
  CoinAvatar2
}: {
  token1?: SplToken
  token2?: SplToken
  /** sx: 16px | sm: 20px | md: 32px | lg: 48px | 2xl: 80px | (default: md) */
  size?: CoinAvatarProps['size']
  className?: string

  CoinAvatar1?: CoinAvatarProps
  CoinAvatar2?: CoinAvatarProps
}) {
  return (
    <Row className={twMerge('-space-x-1', className)}>
      <CoinAvatar size={size} token={token1} {...CoinAvatar1} />
      <CoinAvatar size={size} token={token2} {...CoinAvatar2} />
    </Row>
  )
}
