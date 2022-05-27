import useCreateFarms from '@/application/createFarm/useCreateFarm'
import useLiquidity from '@/application/liquidity/useLiquidity'
import { usePools } from '@/application/pools/usePools'
import useToken from '@/application/token/useToken'
import { AddressItem } from '@/components/AddressItem'
import CoinAvatarPair from '@/components/CoinAvatarPair'
import ListTable from '@/components/ListTable'
import Row from '@/components/Row'
import toPubString from '@/functions/format/toMintString'
import toUsdVolume from '@/functions/format/toUsdVolume'

export function PoolInfoSummary() {
  const poolId = useCreateFarms((s) => s.poolId)
  const pairInfos = usePools((s) => s.hydratedInfos)
  const liquidityPoolJsons = useLiquidity((s) => s.jsonInfos)
  const tokens = useToken((s) => s.tokens)

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
      list={[
        {
          id: poolId,
          pool
        }
      ]}
      labelMapper={[
        {
          label: 'Pool',
          cssGridItemWidth: '2fr'
        },
        {
          label: 'TVL'
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
          return item.pool?.liquidity ? toUsdVolume(item.pool.liquidity, { decimalPlace: 0 }) : '--'
        }
      }}
    />
  )
}
