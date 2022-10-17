import { HydratedConcentratedInfo, UserPositionAccount } from '@/application/concentrated/type'
import Grid from '@/components/Grid'
import Row from '@/components/Row'
import toPubString from '@/functions/format/toMintString'
import { toPercent } from '@/functions/format/toPercent'
import toPercentString from '@/functions/format/toPercentString'
import { add } from '@/functions/numberish/operations'
import { useConcentratedAprCalc, useConcentratedPositionAprCalc } from './useConcentratedAprCalc'

const positionAprLineColors = ['#abc4ff', '#37bbe0', '#2b6aff', '#335095']

export function PositionAprChart(
  option:
    | {
        type: 'positionAccount'
        colCount?: 1 | 2
        positionAccount: UserPositionAccount
      }
    | {
        type: 'poolInfo'
        colCount?: 1 | 2
        poolInfo: HydratedConcentratedInfo
      }
) {
  const colCount = option.colCount ?? 1

  const aprInfo =
    option.type === 'positionAccount'
      ? useConcentratedPositionAprCalc({ positionAccount: option.positionAccount })
      : useConcentratedAprCalc({ ammPool: option.poolInfo })

  if (!aprInfo) return null

  const percentInTotalList = [aprInfo.fee.percentInTotal, ...aprInfo.rewards.map((i) => i.percentInTotal)]
  return (
    <Row className="gap-4">
      {/* circle */}
      <div
        className="w-16 h-16 rounded-full"
        style={{
          background: `conic-gradient(${percentInTotalList
            .map((percent, idx) => {
              const startAt = percentInTotalList.slice(0, idx).reduce((a, b) => toPercent(add(a, b)), toPercent(0))
              const endAt = toPercent(add(startAt, percent))
              return [
                `${positionAprLineColors[idx]} ${toPercentString(startAt)}`,
                `${positionAprLineColors[idx]} ${toPercentString(endAt)}`
              ].join(', ')
            })
            .join(', ')})`,
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
          <div className="text-sm">{toPercentString(aprInfo.fee.apr)}</div>
        </Row>
        {aprInfo.rewards.map(({ token, apr }, idx) => {
          const dotColors = positionAprLineColors.slice(1)
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
              <div className="text-sm">{toPercentString(apr)}</div>
            </Row>
          )
        })}
      </Grid>
    </Row>
  )
}
