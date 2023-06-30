import { twMerge } from 'tailwind-merge'

import { isToken2022 } from '@/application/token/isToken2022'
import { SplToken, Token } from '@/application/token/type'
import Row from './Row'

export interface CoinSymbolProps {
  token: SplToken | Token | undefined

  className?: string
  /** @default 'UNKNOWN'  */
  emptyTokenSymbol?: string
  noToken2022Badge?: boolean
}

export default function CoinSymbol({
  noToken2022Badge,
  token,
  emptyTokenSymbol = 'UNKNOWN',
  className
}: CoinSymbolProps) {
  return (
    <Row className="items-center gap-1">
      <div className={twMerge('max-w-[7em] overflow-hidden text-ellipsis font-normal', className)}>
        {token?.symbol ?? emptyTokenSymbol}
      </div>
      {!noToken2022Badge && isToken2022(token) && (
        <div className="text-2xs text-[#141041] bg-[#abc4ff80] px-1 rounded-sm">2022</div>
      )}
    </Row>
  )
}
