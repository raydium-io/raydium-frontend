import useAppSettings from '@/application/appSettings/useAppSettings'
import useCreateFarms from '@/application/createFarm/useCreateFarm'
import useLiquidity from '@/application/liquidity/useLiquidity'
import { usePools } from '@/application/pools/usePools'
import useToken from '@/application/token/useToken'
import { AddressItem } from '@/components/AddressItem'
import CoinAvatarPair from '@/components/CoinAvatarPair'
import Col from '@/components/Col'
import Icon from '@/components/Icon'
import ListTable from '@/components/ListTable'
import Row from '@/components/Row'
import Tooltip from '@/components/Tooltip'
import toPubString from '@/functions/format/toMintString'
import toPercentString from '@/functions/format/toPercentString'
import toUsdVolume from '@/functions/format/toUsdVolume'

export function PoolInfoSummary() {
  const poolId = useCreateFarms((s) => s.poolId)
  const pairInfos = usePools((s) => s.hydratedInfos)
  const liquidityPoolJsons = useLiquidity((s) => s.jsonInfos)
  const tokens = useToken((s) => s.tokens)
  const isMobile = useAppSettings((s) => s.isMobile)

  const selectedPool = liquidityPoolJsons.find((i) => toPubString(i.id) === poolId)
  const selectedPoolPairInfo = pairInfos.find((i) => i.ammId === poolId)
  const pool = {
    ...selectedPool,
    ...selectedPoolPairInfo,
    baseToken: selectedPool ? tokens[selectedPool.baseMint] : undefined,
    quoteToken: selectedPool ? tokens[selectedPool.quoteMint] : undefined
  }

  return (
    <ListTable
      type={isMobile ? 'item-card' : 'list-table'}
      list={[
        {
          id: poolId,
          pool
        }
      ]}
      getItemKey={(r) => r.id}
      labelMapper={[
        {
          label: 'Pool',
          cssGridItemWidth: '2fr'
        },
        { label: 'TVL' },
        {
          label: 'APR',
          renderLabel: () => (
            <Row>
              <div>APR</div>
              <Tooltip>
                <Icon className="ml-1" size="sm" heroIconName="question-mark-circle" />
                <Tooltip.Panel>
                  <div className="max-w-[300px]">
                    APR based on trading fees earned by the pool in the past 30D. Farming reward APR will be calculated
                    once the farm is live and users have staked.
                  </div>
                </Tooltip.Panel>
              </Tooltip>
            </Row>
          )
        }
      ]}
      renderRowItem={({ item, label }) => {
        if (label === 'Pool') {
          return item.id ? (
            <Row className="gap-1 items-center">
              <CoinAvatarPair token1={item.pool?.baseToken} token2={item.pool?.quoteToken} size="sm" />
              <div>
                <div>
                  {item.pool?.baseToken?.symbol ?? 'UNKNOWN'}-{item.pool?.quoteToken?.symbol ?? 'UNKNOWN'}
                </div>
                <AddressItem showDigitCount={8} textClassName="text-[#abc4ff80] text-xs" canCopy={false}>
                  {toPubString(item.pool?.id)}
                </AddressItem>
              </div>
            </Row>
          ) : (
            '--'
          )
        }
        if (label === 'TVL') {
          return (
            <Col className="justify-center h-full">
              {item.pool?.liquidity ? toUsdVolume(item.pool.liquidity, { decimalPlace: 0 }) : '--'}
            </Col>
          )
        }

        if (label === 'APR') {
          return (
            <Col className="justify-center h-full">
              {item.pool.apr30d ? toPercentString(item.pool.apr30d, { alreadyPercented: true }) : '--'}
            </Col>
          )
        }
      }}
    />
  )
}
