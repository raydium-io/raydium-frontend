import { useMemo } from 'react'
import { UserPositionAccount } from '@/application/concentrated/type'
import useConcentrated from '@/application/concentrated/useConcentrated'
import useToken from '@/application/token/useToken'
import Col from '@/components/Col'
import Row from '@/components/Row'
import toPubString from '@/functions/format/toMintString'
import toPercentString from '@/functions/format/toPercentString'
import { add } from '@/functions/numberish/operations'
import { objectMap } from '@/functions/objectMethods'
import useConnection from '@/application/connection/useConnection'
import Grid from '@/components/Grid'

export function PositionAprChart({
  positionAccount,
  colCount = 1
}: {
  colCount?: 1 | 2
  positionAccount: UserPositionAccount
}) {
  const timeBasis = useConcentrated((s) => s.timeBasis)
  const tokenPrices = useToken((s) => s.tokenPrices)
  const token = useToken((s) => s.tokens)
  const tokenDecimals = objectMap(token, (i) => i.decimals)
  const chainTimeOffset = useConnection((s) => s.chainTimeOffset)
  const aprCalcMethod = useConcentrated((s) => s.aprCalcMode)
  const positionApr = useMemo(
    () =>
      positionAccount?.getPositionApr({
        tokenPrices,
        tokenDecimals,
        timeBasis: timeBasis.toLowerCase() as '24h' | '7d' | '30d',
        planType: aprCalcMethod,
        chainTimeOffsetMs: chainTimeOffset
      }),
    [chainTimeOffset, timeBasis, aprCalcMethod]
  )
  const colors = ['#abc4ff', '#37bbe0', '#2b6aff', '#335095']
  return (
    <Row className="gap-4">
      {/* circle */}
      <div
        className="w-16 h-16 rounded-full"
        style={{
          background: `conic-gradient(${colors[0]} ${toPercentString(positionApr.fee.percentInTotal)}, ${
            colors[1]
          } ${toPercentString(add(positionApr.fee.percentInTotal, 0.005))}, ${colors[1]} ${toPercentString(
            add(positionApr.fee.percentInTotal, positionApr.rewards[0]?.percentInTotal)
          )}, ${colors[2]} ${toPercentString(
            add(add(positionApr.fee.percentInTotal, positionApr.rewards[0]?.percentInTotal), 0.005)
          )})`,
          WebkitMaskImage: 'radial-gradient(transparent 50%, black 51%)',
          maskImage: 'radial-gradient(transparent 50%, black 51%)'
        }}
      ></div>
      <Grid className={`content-around ${colCount === 1 ? 'grid-cols-1' : 'grid-cols-[3fr,2fr]'} gap-x-4`}>
        <Row className="items-center gap-2">
          {/* dot */}
          <div
            className="h-2 w-2 rounded-full"
            style={{
              backgroundColor: '#abc4ff'
            }}
          ></div>
          <div className="w-18 text-[#abc4ff] text-sm mobile:text-xs">Trade Fee</div>
          <div className="text-sm">{toPercentString(positionApr.fee.percentInTotal)}</div>
        </Row>
        {positionApr.rewards.map(({ percentInTotal, token }, idx) => {
          const dotColors = colors.slice(1)
          return (
            <Row className="items-center gap-2" key={toPubString(token?.mint)}>
              {/* dot */}
              <div
                className="h-2 w-2 rounded-full"
                style={{
                  backgroundColor: dotColors[idx]
                }}
              ></div>
              <div className="w-18 text-[#abc4ff] text-sm mobile:text-xs">{token?.symbol}</div>
              <div className="text-sm">{toPercentString(percentInTotal)}</div>
            </Row>
          )
        })}
      </Grid>
    </Row>
  )
}
