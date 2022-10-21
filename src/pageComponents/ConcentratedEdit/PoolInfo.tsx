import useAppSettings from '@/application/common/useAppSettings'
import ListTable from '@/components/ListTable'
import Row from '@/components/Row'
import Col from '@/components/Col'
import CoinAvatarPair from '@/components/CoinAvatarPair'
import { AddressItem } from '@/components/AddressItem'
import toPercentString from '@/functions/format/toPercentString'
import toUsdVolume from '@/functions/format/toUsdVolume'
import { HydratedConcentratedInfo } from '@/application/concentrated/type'

interface Props {
  pool?: HydratedConcentratedInfo
}

export default function PoolInfo({ pool }: Props) {
  const isMobile = useAppSettings((s) => s.isMobile)

  return (
    <ListTable
      className="mb-8"
      type={isMobile ? 'item-card' : 'list-table'}
      itemClassName={isMobile ? 'grid-cols-[1fr,2fr]' : undefined}
      list={pool ? [{ id: pool.idString, pool }] : []}
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
            </Row>
          )
        }
      ]}
      renderRowItem={({ item, label }) => {
        if (label === 'Pool') {
          return item.id ? (
            <Row className="gap-1 items-center">
              <CoinAvatarPair token1={item.pool.base} token2={item.pool.quote} size="sm" />
              <div>
                <div>
                  {item.pool.base?.symbol ?? 'UNKNOWN'}-{item.pool.quote?.symbol ?? 'UNKNOWN'}
                </div>
                <AddressItem showDigitCount={8} textClassName="text-[#abc4ff80] text-xs" canCopy={false}>
                  {item.pool.idString}
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
              {item.pool.tvl ? toUsdVolume(item.pool.tvl, { decimalPlace: 0 }) : '--'}
            </Col>
          )
        }

        if (label === 'APR') {
          return (
            <Col className="justify-center h-full">
              {item.pool.totalApr30d ? toPercentString(item.pool.totalApr30d) : '--'}
            </Col>
          )
        }
      }}
    />
  )
}
