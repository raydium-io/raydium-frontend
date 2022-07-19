import { useCallback, useMemo } from 'react'

import { twMerge } from 'tailwind-merge'

import useAppSettings from '@/application/appSettings/useAppSettings'
import useFarms from '@/application/farms/useFarms'
import { isHydratedPoolItemInfo } from '@/application/pools/is'
import { HydratedPairItemInfo } from '@/application/pools/type'
import { usePoolFavoriteIds, usePools } from '@/application/pools/usePools'
import usePoolSummeryInfoLoader from '@/application/pools/usePoolSummeryInfoLoader'
import { routeTo } from '@/application/routeTools'
import { LpToken } from '@/application/token/type'
import useToken from '@/application/token/useToken'
import useWallet from '@/application/wallet/useWallet'
import AutoBox from '@/components/AutoBox'
import { Badge } from '@/components/Badge'
import Button from '@/components/Button'
import Card from '@/components/Card'
import CoinAvatarPair from '@/components/CoinAvatarPair'
import Collapse from '@/components/Collapse'
import CyberpunkStyleCard from '@/components/CyberpunkStyleCard'
import Grid from '@/components/Grid'
import Icon from '@/components/Icon'
import Input from '@/components/Input'
import List from '@/components/List'
import LoadingCircle from '@/components/LoadingCircle'
import PageLayout from '@/components/PageLayout'
import Popover from '@/components/Popover'
import RefreshCircle from '@/components/RefreshCircle'
import Row from '@/components/Row'
import Select from '@/components/Select'
import Switcher from '@/components/Switcher'
import Tooltip from '@/components/Tooltip'
import { addItem, removeItem, shakeFalsyItem } from '@/functions/arrayMethods'
import formatNumber from '@/functions/format/formatNumber'
import toPubString from '@/functions/format/toMintString'
import toPercentString from '@/functions/format/toPercentString'
import toTotalPrice from '@/functions/format/toTotalPrice'
import toUsdVolume from '@/functions/format/toUsdVolume'
import { gt, isMeaningfulNumber, lt } from '@/functions/numberish/compare'
import { toString } from '@/functions/numberish/toString'
import { objectFilter, objectShakeFalsy } from '@/functions/objectMethods'
import { searchItems } from '@/functions/searchItems'
import useSort from '@/hooks/useSort'
import { capitalize } from '@/functions/changeCase'
import { isMintEqual } from '@/functions/judgers/areEqual'

/**
 * store:
 * {@link useCurrentPage `useCurrentPage`} ui page store
 * {@link usePools `usePools`} pools store
 * {@link useDatabase `useDatabase`} detail data is from liquidity
 */
export default function PoolsPage() {
  usePoolSummeryInfoLoader()
  return (
    <PageLayout contentButtonPaddingShorter mobileBarTitle="Pools" metaTitle="Pools - Raydium">
      <PoolHeader />
      <PoolCard />
    </PageLayout>
  )
}

function PoolHeader() {
  const tvl = usePools((s) => s.tvl)
  const volume24h = usePools((s) => s.volume24h)
  const isMobile = useAppSettings((s) => s.isMobile)
  return isMobile ? (
    <Row className="mx-auto my-2 text-base mobile:text-xs justify-self-start self-end text-[#abc4ff80] gap-4">
      <div className="whitespace-nowrap">
        TVL: <span className="font-medium text-[#abc4ff]">${formatNumber(tvl)}</span>
      </div>
      <div className="whitespace-nowrap">
        Volume24H: <span className="font-medium text-[#abc4ff]">${formatNumber(volume24h)}</span>
      </div>
    </Row>
  ) : (
    <Grid className="grid-cols-[1fr,1fr] mobile:grid-cols-2 grid-flow-row-dense items-center gap-y-8 pb-8">
      <Row className="justify-self-start gap-8">
        <div className="text-2xl mobile:text-lg text-white font-semibold">Pools</div>
        <Row className="title text-base mobile:text-xs justify-self-start self-end text-[#abc4ff80] gap-4">
          <div className="whitespace-nowrap">
            TVL: <span className="font-medium text-[#abc4ff]">${formatNumber(tvl)}</span>
          </div>
          <div className="whitespace-nowrap">
            Volume24H: <span className="font-medium text-[#abc4ff]">${formatNumber(volume24h)}</span>
          </div>
        </Row>
      </Row>
      <Row
        className={`justify-self-end self-center gap-1 flex-wrap items-center opacity-100 pointer-events-auto clickable transition`}
        onClick={() => {
          routeTo('/liquidity/create')
        }}
      >
        <Icon heroIconName="plus-circle" className="text-[#abc4ff]" size="sm" />
        <span className="text-[#abc4ff] font-medium text-sm mobile:text-xs">Create Pool</span>
      </Row>
    </Grid>
  )
}

function PoolStakedOnlyBlock() {
  const onlySelfPools = usePools((s) => s.onlySelfPools)
  const connected = useWallet((s) => s.connected)
  if (!connected) return null
  return (
    <Row className="justify-self-end mobile:justify-self-auto items-center">
      <span className="text-[rgba(196,214,255,0.5)] font-medium text-sm mobile:text-xs whitespace-nowrap">
        Show Staked
      </span>
      <Switcher
        className="ml-2"
        defaultChecked={onlySelfPools}
        onToggle={(isOnly) => {
          usePools.setState({ onlySelfPools: isOnly })
        }}
      />
    </Row>
  )
}

function ToolsButton({ className }: { className?: string }) {
  return (
    <>
      <Popover placement="bottom-right">
        <Popover.Button>
          <div className={twMerge('mx-1 rounded-full p-2 text-[#abc4ff] clickable justify-self-start', className)}>
            <Icon className="w-4 h-4" iconClassName="w-4 h-4" heroIconName="dots-vertical" />
          </div>
        </Popover.Button>
        <Popover.Panel>
          <div>
            <Card
              className="flex flex-col py-3 px-4  max-h-[80vh] border-1.5 border-[rgba(171,196,255,0.2)] bg-cyberpunk-card-bg shadow-cyberpunk-card"
              size="lg"
            >
              <Grid className="grid-cols-1 items-center gap-2">
                <PoolStakedOnlyBlock />
                <PoolRefreshCircleBlock />
                <PoolTimeBasisSelectorBox />
              </Grid>
            </Card>
          </div>
        </Popover.Panel>
      </Popover>
    </>
  )
}

function PoolSearchBlock({ className }: { className?: string }) {
  const isMobile = useAppSettings((s) => s.isMobile)
  const storeSearchText = usePools((s) => s.searchText)
  return (
    <Input
      value={storeSearchText}
      className={twMerge(
        'px-2 py-2 mobile:py-1 gap-2 ring-inset ring-1 ring-[rgba(196,214,255,0.5)] rounded-xl mobile:rounded-lg min-w-[6em]',
        className
      )}
      inputClassName="font-medium text-sm mobile:text-xs text-[rgba(196,214,255,0.5)] placeholder-[rgba(196,214,255,0.5)]"
      prefix={<Icon heroIconName="search" size={isMobile ? 'sm' : 'smi'} className="text-[rgba(196,214,255,0.5)]" />}
      suffix={
        <Icon
          heroIconName="x"
          size={isMobile ? 'xs' : 'sm'}
          className={`text-[rgba(196,214,255,0.5)] transition clickable ${
            storeSearchText ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          onClick={() => {
            usePools.setState({ searchText: '' })
          }}
        />
      }
      placeholder="Search All"
      onUserInput={(searchText) => {
        usePools.setState({ searchText })
      }}
    />
  )
}

function PoolLabelBlock({ className }: { className?: string }) {
  return (
    <div className={className}>
      <div className="font-medium text-xl mobile:text-base text-white">Liquidity Pools</div>
      <div className="font-medium text-[rgba(196,214,255,.5)] text-base mobile:text-sm">
        Earn yield on trading fees by providing liquidity
      </div>
    </div>
  )
}

function PoolTimeBasisSelectorBox({ className }: { className?: string }) {
  const timeBasis = usePools((s) => s.timeBasis)
  return (
    <Select
      className={twMerge('z-20', className)}
      candidateValues={['24H', '7D', '30D']}
      localStorageKey="ui-time-basis"
      defaultValue={timeBasis}
      prefix="Time Basis:"
      onChange={(newSortKey) => {
        usePools.setState({ timeBasis: newSortKey ?? '7D' })
      }}
    />
  )
}

function PoolTableSorterBox({
  className,
  onChange
}: {
  className?: string
  onChange?: (
    sortKey:
      | 'liquidity'
      | 'apr24h'
      | 'apr7d'
      | 'apr30d'
      | 'fee7d'
      | 'fee24h'
      | 'fee30d'
      | 'name'
      | 'volume7d'
      | 'volume24h'
      | 'volume30d'
      | 'favorite'
      | undefined
  ) => void
}) {
  const timeBasis = usePools((s) => s.timeBasis)
  return (
    <Select
      className={className}
      candidateValues={[
        { label: 'Pool', value: 'name' },
        { label: 'Liquidity', value: 'liquidity' },
        {
          label: `Volume ${timeBasis}`,
          value: timeBasis === '24H' ? 'volume24h' : timeBasis === '7D' ? 'volume7d' : 'volume30d'
        },
        {
          label: `Fees ${timeBasis}`,
          value: timeBasis === '24H' ? 'fee24h' : timeBasis === '7D' ? 'fee7d' : 'fee30d'
        },
        { label: `APR ${timeBasis}`, value: timeBasis === '24H' ? 'apr24h' : timeBasis === '7D' ? 'apr7d' : 'apr30d' },
        { label: 'Favorite', value: 'favorite' }
      ]}
      // defaultValue="apr"
      prefix="Sort by:"
      onChange={onChange}
    />
  )
}
function PoolRefreshCircleBlock({ className }: { className?: string }) {
  const isMobile = useAppSettings((s) => s.isMobile)
  return isMobile ? (
    <Row className={twMerge('items-center', className)}>
      <span className="text-[rgba(196,214,255,0.5)] font-medium text-sm mobile:text-xs">Refresh Pools</span>
      <RefreshCircle
        refreshKey="pools"
        freshFunction={() => {
          usePools.getState().refreshPools()
        }}
      />
    </Row>
  ) : (
    <div className={twMerge('justify-self-end', className)}>
      <RefreshCircle
        refreshKey="pools"
        freshFunction={() => {
          usePools.getState().refreshPools()
        }}
      />
    </div>
  )
}

function PoolCard() {
  const balances = useWallet((s) => s.balances)
  const unZeroBalances = objectFilter(balances, (tokenAmount) => gt(tokenAmount, 0))
  const { hydratedInfos } = usePools()
  // const { searchText, setSearchText, currentTab, onlySelfPools } = usePageState()

  const searchText = usePools((s) => s.searchText)
  const currentTab = usePools((s) => s.currentTab)
  const onlySelfPools = usePools((s) => s.onlySelfPools)
  const timeBasis = usePools((s) => s.timeBasis)

  const isMobile = useAppSettings((s) => s.isMobile)
  const [favouriteIds] = usePoolFavoriteIds()

  const dataSource = useMemo(
    () =>
      hydratedInfos
        .filter((i) => (currentTab === 'All' ? true : currentTab === 'Raydium' ? i.official : !i.official)) // Tab
        .filter((i) => (onlySelfPools ? Object.keys(unZeroBalances).includes(i.lpMint) : true)), // Switch
    [onlySelfPools, searchText, hydratedInfos]
  )

  const searched = useMemo(
    () =>
      searchItems(dataSource, {
        text: searchText,
        matchConfigs: (i) => [
          { text: i.ammId, entirely: true },
          { text: i.market, entirely: true }, // Input Auto complete result sort setting
          { text: i.lpMint, entirely: true },
          { text: toPubString(i.base?.mint), entirely: true },
          { text: toPubString(i.quote?.mint), entirely: true },
          i.base?.symbol,
          i.quote?.symbol
          // i.base?.name,
          // i.quote?.name
        ]
      }),
    [dataSource, searchText]
  )

  const {
    sortedData,
    setConfig: setSortConfig,
    sortConfig,
    clearSortConfig
  } = useSort(searched, {
    defaultSort: { key: 'defaultKey', sortCompare: [(i) => favouriteIds?.includes(i.ammId), (i) => i.liquidity] }
  })

  const TableHeaderBlock = useCallback(
    () => (
      <Row
        type="grid-x"
        className="mb-3 h-12 justify-between sticky -top-6 backdrop-filter z-10 backdrop-blur-md bg-[rgba(20,16,65,0.2)] mr-scrollbar rounded-xl mobile:rounded-lg gap-2 grid-cols-[auto,1.6fr,1fr,1fr,1fr,.8fr,auto]"
      >
        <Row
          className="group w-20 pl-10 font-medium text-[#ABC4FF] text-sm items-center cursor-pointer  clickable clickable-filter-effect no-clicable-transform-effect"
          onClick={() => {
            setSortConfig({
              key: 'favorite',
              sortModeQueue: ['decrease', 'none'],
              sortCompare: [(i) => favouriteIds?.includes(i.ammId), (i) => i.liquidity]
            })
          }}
        >
          <Icon
            className={`ml-1 ${
              sortConfig?.key === 'favorite' && sortConfig.mode !== 'none'
                ? 'opacity-100'
                : 'opacity-0 group-hover:opacity-30'
            } transition`}
            size="sm"
            iconSrc="/icons/msic-sort-only-down.svg"
          />
        </Row>

        {/* empty header */}
        <Grid className="grid-cols-[.4fr,1.2fr] clickable clickable-filter-effect no-clicable-transform-effect">
          <div></div>

          {/* table head column: Pool */}
          <Row
            className="font-medium text-[#ABC4FF] text-sm items-center cursor-pointer"
            onClick={() => {
              setSortConfig({
                key: 'name',
                sortModeQueue: ['increase', 'decrease', 'none'],
                sortCompare: (i) => i.name
              })
            }}
          >
            Pool
            <Icon
              className="ml-1"
              size="sm"
              iconSrc={
                sortConfig?.key === 'name' && sortConfig.mode !== 'none'
                  ? sortConfig?.mode === 'decrease'
                    ? '/icons/msic-sort-down.svg'
                    : '/icons/msic-sort-up.svg'
                  : '/icons/msic-sort.svg'
              }
            />
          </Row>
        </Grid>

        {/* table head column: liquidity */}
        <Row
          className="font-medium text-[#ABC4FF] text-sm items-center cursor-pointer clickable clickable-filter-effect no-clicable-transform-effect"
          onClick={() => {
            setSortConfig({ key: 'liquidity', sortCompare: (i) => i.liquidity })
          }}
        >
          Liquidity
          <Icon
            className="ml-1"
            size="sm"
            iconSrc={
              sortConfig?.key === 'liquidity' && sortConfig.mode !== 'none'
                ? sortConfig?.mode === 'decrease'
                  ? '/icons/msic-sort-down.svg'
                  : '/icons/msic-sort-up.svg'
                : '/icons/msic-sort.svg'
            }
          />
        </Row>

        {/* table head column: volume24h */}
        <Row
          className="font-medium text-[#ABC4FF] text-sm items-center cursor-pointer clickable clickable-filter-effect no-clicable-transform-effect"
          onClick={() => {
            const key = timeBasis === '24H' ? 'volume24h' : timeBasis === '7D' ? 'volume7d' : 'volume30d'
            setSortConfig({ key, sortCompare: (i) => i[key] })
          }}
        >
          Volume {timeBasis}
          <Icon
            className="ml-1"
            size="sm"
            iconSrc={
              sortConfig?.key.startsWith('volume') && sortConfig.mode !== 'none'
                ? sortConfig?.mode === 'decrease'
                  ? '/icons/msic-sort-down.svg'
                  : '/icons/msic-sort-up.svg'
                : '/icons/msic-sort.svg'
            }
          />
        </Row>

        {/* table head column: fee7d */}
        <Row
          className="font-medium text-[#ABC4FF] text-sm items-center cursor-pointer clickable clickable-filter-effect no-clicable-transform-effect"
          onClick={() => {
            const key = timeBasis === '24H' ? 'fee24h' : timeBasis === '7D' ? 'fee7d' : 'fee30d'
            setSortConfig({ key, sortCompare: (i) => i[key] })
          }}
        >
          Fees {timeBasis}
          <Icon
            className="ml-1"
            size="sm"
            iconSrc={
              sortConfig?.key.startsWith('fee') && sortConfig.mode !== 'none'
                ? sortConfig?.mode === 'decrease'
                  ? '/icons/msic-sort-down.svg'
                  : '/icons/msic-sort-up.svg'
                : '/icons/msic-sort.svg'
            }
          />
        </Row>

        {/* table head column: volume24h */}
        <Row
          className="font-medium text-[#ABC4FF] text-sm items-center cursor-pointer clickable clickable-filter-effect no-clicable-transform-effect"
          onClick={() => {
            const key = timeBasis === '24H' ? 'apr24h' : timeBasis === '7D' ? 'apr7d' : 'apr30d'
            setSortConfig({ key, sortCompare: (i) => i[key] })
          }}
        >
          APR {timeBasis}
          <Tooltip>
            <Icon className="ml-1" size="sm" heroIconName="question-mark-circle" />
            <Tooltip.Panel>
              Estimated APR based on trading fees earned by the pool in the past {timeBasis}
            </Tooltip.Panel>
          </Tooltip>
          <Icon
            className="ml-1"
            size="sm"
            iconSrc={
              sortConfig?.key.startsWith('apr') && sortConfig.mode !== 'none'
                ? sortConfig?.mode === 'decrease'
                  ? '/icons/msic-sort-down.svg'
                  : '/icons/msic-sort-up.svg'
                : '/icons/msic-sort.svg'
            }
          />
        </Row>

        <PoolRefreshCircleBlock className="pr-8 self-center" />
      </Row>
    ),
    [sortConfig, timeBasis]
  )

  // NOTE: filter widgets
  const innerPoolDatabaseWidgets = isMobile ? (
    <div>
      <Row className="mb-4">
        <PoolSearchBlock className="grow-2 mr-3" />
        <PoolTableSorterBox
          className="grow"
          onChange={(newSortKey) => {
            newSortKey
              ? setSortConfig({
                  key: newSortKey,
                  sortCompare: newSortKey === 'favorite' ? (i) => favouriteIds?.includes(i.ammId) : (i) => i[newSortKey]
                })
              : clearSortConfig()
          }}
        />
        <ToolsButton className="self-center" />
      </Row>
    </div>
  ) : (
    <div>
      <Row className={'justify-between pb-5 gap-16 items-center'}>
        <PoolLabelBlock />
        <Row className="gap-6 items-stretch">
          <PoolStakedOnlyBlock />
          <PoolTimeBasisSelectorBox />
          <PoolSearchBlock />
        </Row>
      </Row>
    </div>
  )
  return (
    <CyberpunkStyleCard
      haveMinHeight
      wrapperClassName="flex-1 overflow-hidden flex flex-col"
      className="p-10 pb-4 mobile:px-3 mobile:py-3 w-full flex flex-col flex-grow h-full"
    >
      {innerPoolDatabaseWidgets}
      {!isMobile && <TableHeaderBlock />}
      <PoolCardDatabaseBody sortedData={sortedData} />
    </CyberpunkStyleCard>
  )
}

function PoolCardDatabaseBody({ sortedData }: { sortedData: HydratedPairItemInfo[] }) {
  const loading = usePools((s) => s.loading)
  const [favouriteIds, setFavouriteIds] = usePoolFavoriteIds()
  return sortedData.length ? (
    <List className="gap-3 mobile:gap-2 text-[#ABC4FF] flex-1 -mx-2 px-2" /* let scrollbar have some space */>
      {sortedData.map((info) => (
        <List.Item key={info.lpMint}>
          <Collapse>
            <Collapse.Face>
              {(open) => (
                <PoolCardDatabaseBodyCollapseItemFace
                  open={open}
                  info={info}
                  isFavourite={favouriteIds?.includes(info.ammId)}
                  onUnFavorite={(ammId) => {
                    setFavouriteIds((ids) => removeItem(ids ?? [], ammId))
                  }}
                  onStartFavorite={(ammId) => {
                    setFavouriteIds((ids) => addItem(ids ?? [], ammId))
                  }}
                />
              )}
            </Collapse.Face>
            <Collapse.Body>
              <PoolCardDatabaseBodyCollapseItemContent poolInfo={info} />
            </Collapse.Body>
          </Collapse>
        </List.Item>
      ))}
    </List>
  ) : (
    <div className="text-center text-2xl p-12 opacity-50 text-[rgb(171,196,255)]">
      {loading ? <LoadingCircle /> : '(No results found)'}
    </div>
  )
}

function PoolCardDatabaseBodyCollapseItemFace({
  open,
  info,
  isFavourite,
  onUnFavorite,
  onStartFavorite
}: {
  open: boolean
  info: HydratedPairItemInfo
  isFavourite?: boolean
  onUnFavorite?: (ammId: string) => void
  onStartFavorite?: (ammId: string) => void
}) {
  const lpTokens = useToken((s) => s.lpTokens)
  const lpToken = lpTokens[info.lpMint] as LpToken | undefined
  const haveLp = Boolean(lpToken)
  const isMobile = useAppSettings((s) => s.isMobile)
  const isTablet = useAppSettings((s) => s.isTablet)
  const timeBasis = usePools((s) => s.timeBasis)

  const pcCotent = (
    <Row
      type="grid-x"
      className={`py-5 mobile:py-4 mobile:px-5 bg-[#141041] items-center gap-2 grid-cols-[auto,1.6fr,1fr,1fr,1fr,.8fr,auto] mobile:grid-cols-[1fr,1fr,1fr,auto] rounded-t-3xl mobile:rounded-t-lg ${
        open ? '' : 'rounded-b-3xl mobile:rounded-b-lg'
      } transition-all`}
    >
      <div className="w-12 self-center ml-6 mr-2">
        {isFavourite ? (
          <Icon
            iconSrc="/icons/misc-star-filled.svg"
            onClick={({ ev }) => {
              ev.stopPropagation()
              onUnFavorite?.(info.ammId)
            }}
            className="clickable clickable-mask-offset-2 m-auto self-center"
          />
        ) : (
          <Icon
            iconSrc="/icons/misc-star-empty.svg"
            onClick={({ ev }) => {
              ev.stopPropagation()
              onStartFavorite?.(info.ammId)
            }}
            className="clickable clickable-mask-offset-2 opacity-30 hover:opacity-80 transition m-auto self-center"
          />
        )}
      </div>

      <CoinAvatarInfoItem info={info} className="pl-0" />

      <TextInfoItem
        name="Liquidity"
        value={
          isHydratedPoolItemInfo(info)
            ? toUsdVolume(info.liquidity, { autoSuffix: isTablet, decimalPlace: 0 })
            : undefined
        }
      />
      <TextInfoItem
        name={`Volume(${timeBasis})`}
        value={
          isHydratedPoolItemInfo(info)
            ? timeBasis === '24H'
              ? toUsdVolume(info.volume24h, { autoSuffix: isTablet, decimalPlace: 0 })
              : timeBasis === '7D'
              ? toUsdVolume(info.volume7d, { autoSuffix: isTablet, decimalPlace: 0 })
              : toUsdVolume(info.volume30d, { autoSuffix: isTablet, decimalPlace: 0 })
            : undefined
        }
      />
      <TextInfoItem
        name={`Fees(${timeBasis})`}
        value={
          isHydratedPoolItemInfo(info)
            ? timeBasis === '24H'
              ? toUsdVolume(info.fee24h, { autoSuffix: isTablet, decimalPlace: 0 })
              : timeBasis === '7D'
              ? toUsdVolume(info.fee7d, { autoSuffix: isTablet, decimalPlace: 0 })
              : toUsdVolume(info.fee30d, { autoSuffix: isTablet, decimalPlace: 0 })
            : undefined
        }
      />
      <TextInfoItem
        name={`APR(${timeBasis})`}
        value={
          isHydratedPoolItemInfo(info)
            ? timeBasis === '24H'
              ? toPercentString(info.apr24h, { alreadyPercented: true })
              : timeBasis === '7D'
              ? toPercentString(info.apr7d, { alreadyPercented: true })
              : toPercentString(info.apr30d, { alreadyPercented: true })
            : undefined
        }
      />
      <Grid className="w-9 h-9 mr-8 place-items-center">
        <Icon size="sm" heroIconName={`${open ? 'chevron-up' : 'chevron-down'}`} />
      </Grid>
    </Row>
  )

  const mobileContent = (
    <Collapse open={open}>
      <Collapse.Face>
        <Row
          type="grid-x"
          className={`py-3 px-3 items-center gap-2 grid-cols-[auto,1.5fr,1fr,1fr,auto] bg-[#141041] mobile:rounded-t-lg ${
            open ? '' : 'rounded-b-3xl mobile:rounded-b-lg'
          }`}
        >
          <div className="w-8 self-center ">
            {isFavourite ? (
              <Icon
                className="clickable m-auto self-center"
                iconSrc="/icons/misc-star-filled.svg"
                onClick={({ ev }) => {
                  ev.stopPropagation()
                  onUnFavorite?.(info.ammId)
                }}
                size="sm"
              />
            ) : (
              <Icon
                className="clickable opacity-30 hover:opacity-80 transition clickable-mask-offset-2 m-auto self-center"
                iconSrc="/icons/misc-star-empty.svg"
                onClick={({ ev }) => {
                  ev.stopPropagation()
                  onStartFavorite?.(info.ammId)
                }}
                size="sm"
              />
            )}
          </div>

          <CoinAvatarInfoItem info={info} />

          <TextInfoItem
            name="Liquidity"
            value={
              isHydratedPoolItemInfo(info)
                ? toUsdVolume(info.liquidity, { autoSuffix: true, decimalPlace: 1 })
                : undefined
            }
          />
          <TextInfoItem
            name={`APR(${timeBasis})`}
            value={
              isHydratedPoolItemInfo(info)
                ? timeBasis === '24H'
                  ? toPercentString(info.apr24h, { alreadyPercented: true })
                  : timeBasis === '7D'
                  ? toPercentString(info.apr7d, { alreadyPercented: true })
                  : toPercentString(info.apr30d, { alreadyPercented: true })
                : undefined
            }
          />

          <Grid className="w-6 h-6 place-items-center">
            <Icon size="sm" heroIconName={`${open ? 'chevron-up' : 'chevron-down'}`} />
          </Grid>
        </Row>
      </Collapse.Face>

      <Collapse.Body>
        <Row
          type="grid-x"
          className="py-4 px-5 pl-12 relative items-center gap-2 grid-cols-[1.5fr,1fr,1fr,auto]  bg-[#141041]"
        >
          <div className="absolute top-0 left-5 right-5 border-[rgba(171,196,255,.2)] border-t-1.5"></div>
          <TextInfoItem
            name="Volume(7d)"
            value={
              isHydratedPoolItemInfo(info)
                ? toUsdVolume(info.volume7d, { autoSuffix: true, decimalPlace: 0 })
                : undefined
            }
          />
          <TextInfoItem
            name="Volume(24h)"
            value={
              isHydratedPoolItemInfo(info)
                ? toUsdVolume(info.volume24h, { autoSuffix: true, decimalPlace: 0 })
                : undefined
            }
          />
          <TextInfoItem
            name="Fees(7d)"
            value={
              isHydratedPoolItemInfo(info) ? toUsdVolume(info.fee7d, { autoSuffix: true, decimalPlace: 0 }) : undefined
            }
          />

          <Grid className="w-6 h-6 place-items-center"></Grid>
        </Row>
      </Collapse.Body>
    </Collapse>
  )

  if (!haveLp) return null
  return isMobile ? mobileContent : pcCotent
}

function PoolCardDatabaseBodyCollapseItemContent({ poolInfo: info }: { poolInfo: HydratedPairItemInfo }) {
  const isMobile = useAppSettings((s) => s.isMobile)
  const balances = useWallet((s) => s.balances)
  const lightBoardClass = 'bg-[rgba(20,16,65,.2)]'
  const farmPoolsList = useFarms((s) => s.hydratedInfos)
  const prices = usePools((s) => s.lpPrices)

  const hasLp = isMeaningfulNumber(balances[info.lpMint])

  const correspondingFarm = useMemo(
    () => farmPoolsList.find((farmInfo) => isMintEqual(farmInfo.lpMint, info.lpMint) && !farmInfo.isClosedPool),
    [info]
  )

  return (
    <AutoBox
      is={isMobile ? 'Col' : 'Row'}
      className={`justify-between rounded-b-3xl mobile:rounded-b-lg`}
      style={{
        background: 'linear-gradient(126.6deg, rgba(171, 196, 255, 0.12), rgb(171 196 255 / 4%) 100%)'
      }}
    >
      <AutoBox
        is={isMobile ? 'Grid' : 'Row'}
        className={`py-5 px-8 mobile:py-3 mobile:px-4 gap-[4vw] mobile:gap-3 mobile:grid-cols-3-auto flex-grow justify-between mobile:m-0`}
      >
        <Row>
          <div className="flex-grow">
            <div className="text-[rgba(171,196,255,0.5)] font-medium text-sm mobile:text-2xs mb-1">Your Liquidity</div>
            <div className="text-white font-medium text-base mobile:text-xs">
              {toUsdVolume(toTotalPrice(balances[info.lpMint], prices[info.lpMint]))}
            </div>
            <div className="text-[rgba(171,196,255,0.5)] font-medium text-sm mobile:text-2xs">
              {isHydratedPoolItemInfo(info) ? toString(balances[info.lpMint] ?? 0) + ' LP' : '--'}
            </div>
          </div>
        </Row>
        <Row>
          <div className="flex-grow">
            <div className="text-[rgba(171,196,255,0.5)] font-medium text-sm mobile:text-2xs mb-1">Assets Pooled</div>
            <div className="text-white font-medium text-base mobile:text-xs">
              {isHydratedPoolItemInfo(info) ? `${toString(info.basePooled || 0)} ${info.base?.symbol ?? ''}` : '--'}
            </div>
            <div className="text-white font-medium text-base mobile:text-xs">
              {isHydratedPoolItemInfo(info) ? `${toString(info.quotePooled || 0)} ${info.quote?.symbol ?? ''}` : '--'}
            </div>
          </div>
        </Row>
        <Row>
          <div className="flex-grow">
            <div className="text-[rgba(171,196,255,0.5)] font-medium text-sm mobile:text-2xs mb-1">Your Share</div>
            <div className="text-white font-medium text-base mobile:text-xs">
              {isHydratedPoolItemInfo(info) ? toPercentString(info.sharePercent) : '--%'}
            </div>
          </div>
        </Row>
      </AutoBox>

      <Row
        className={`px-8 py-2 gap-3 items-center self-center justify-center ${
          isMobile ? lightBoardClass : ''
        } mobile:w-full`}
      >
        {isMobile ? (
          <Row className="gap-5">
            <Icon
              size="sm"
              heroIconName="plus"
              className="grid place-items-center w-10 h-10 mobile:w-8 mobile:h-8 ring-inset ring-1 mobile:ring-1 ring-[rgba(171,196,255,.5)] rounded-xl mobile:rounded-lg text-[rgba(171,196,255,.5)] clickable clickable-filter-effect"
              onClick={() => {
                routeTo('/liquidity/add', {
                  queryProps: {
                    ammId: info.ammId
                  }
                })
              }}
            />
            <Icon
              size="sm"
              iconSrc="/icons/pools-remove-liquidity-entry.svg"
              className={`grid place-items-center w-10 h-10 mobile:w-8 mobile:h-8 ring-inset ring-1 mobile:ring-1 ring-[rgba(171,196,255,.5)] rounded-xl mobile:rounded-lg text-[rgba(171,196,255,.5)] 'clickable' clickable-filter-effect`}
              onClick={() => {
                routeTo('/liquidity/add', {
                  queryProps: {
                    ammId: info.ammId,
                    mode: 'removeLiquidity'
                  }
                })
              }}
            />
            <Icon
              size="sm"
              iconSrc="/icons/msic-swap-h.svg"
              className="grid place-items-center w-10 h-10 mobile:w-8 mobile:h-8 ring-inset ring-1 mobile:ring-1 ring-[rgba(171,196,255,.5)] rounded-xl mobile:rounded-lg text-[rgba(171,196,255,.5)] clickable clickable-filter-effect"
              onClick={() => {
                routeTo('/swap', {
                  queryProps: {
                    coin1: info.base,
                    coin2: info.quote
                  }
                })
              }}
            />
          </Row>
        ) : (
          <>
            <Button
              className="frosted-glass-teal"
              onClick={() => {
                routeTo('/liquidity/add', {
                  queryProps: {
                    ammId: info.ammId
                  }
                })
              }}
            >
              Add Liquidity
            </Button>
            <Tooltip>
              <Icon
                size="smi"
                iconSrc="/icons/pools-farm-entry.svg"
                className={`grid place-items-center w-10 h-10 mobile:w-8 mobile:h-8 ring-inset ring-1 mobile:ring-1 ring-[rgba(171,196,255,.5)] rounded-xl mobile:rounded-lg text-[rgba(171,196,255,.5)] clickable-filter-effect ${
                  correspondingFarm ? 'clickable' : 'not-clickable'
                }`}
                onClick={() => {
                  routeTo('/farms', {
                    //@ts-expect-error no need to care about enum of this error
                    queryProps: objectShakeFalsy({
                      currentTab: correspondingFarm?.category ? capitalize(correspondingFarm?.category) : undefined,
                      newExpandedItemId: toPubString(correspondingFarm?.id),
                      searchText: String(correspondingFarm?.id)
                    })
                  })
                }}
              />
              <Tooltip.Panel>Farm</Tooltip.Panel>
            </Tooltip>
            <Tooltip>
              <Icon
                size="smi"
                iconSrc="/icons/pools-remove-liquidity-entry.svg"
                className={`grid place-items-center w-10 h-10 mobile:w-8 mobile:h-8 ring-inset ring-1 mobile:ring-1 ring-[rgba(171,196,255,.5)] rounded-xl mobile:rounded-lg text-[rgba(171,196,255,.5)] ${
                  hasLp ? 'opacity-100 clickable clickable-filter-effect' : 'opacity-50 not-clickable'
                }`}
                onClick={() => {
                  hasLp &&
                    routeTo('/liquidity/add', {
                      queryProps: {
                        ammId: info.ammId,
                        mode: 'removeLiquidity'
                      }
                    })
                }}
              />
              <Tooltip.Panel>Remove Liquidity</Tooltip.Panel>
            </Tooltip>
            <Tooltip>
              <Icon
                iconSrc="/icons/msic-swap-h.svg"
                size="smi"
                className="grid place-items-center w-10 h-10 mobile:w-8 mobile:h-8 ring-inset ring-1 mobile:ring-1 ring-[rgba(171,196,255,.5)] rounded-xl mobile:rounded-lg text-[rgba(171,196,255,.5)] clickable clickable-filter-effect"
                onClick={() => {
                  routeTo('/swap', {
                    queryProps: {
                      coin1: info.base,
                      coin2: info.quote
                    }
                  })
                }}
              />
              <Tooltip.Panel>Swap</Tooltip.Panel>
            </Tooltip>
          </>
        )}
      </Row>
    </AutoBox>
  )
}

function CoinAvatarInfoItem({ info, className }: { info: HydratedPairItemInfo | undefined; className?: string }) {
  const isMobile = useAppSettings((s) => s.isMobile)
  const lowLiquidityAlertText = `This pool has relatively low liquidity. Always check the quoted price and that the pool has sufficient liquidity before trading.`

  return (
    <AutoBox
      is={isMobile ? 'Col' : 'Row'}
      className={twMerge('clickable flex-wrap items-center mobile:items-start', className)}
      // onClick={() => {
      //   if (!isMobile) push(`/liquidity/?ammId=${ammId}`)
      // }}
    >
      <CoinAvatarPair
        className="justify-self-center mr-2"
        size={isMobile ? 'sm' : 'md'}
        token1={info?.base}
        token2={info?.quote}
      />
      <Row className="mobile:text-xs font-medium mobile:mt-px items-center flex-wrap gap-2">
        {info?.name}
        {info?.isStablePool && <Badge className="self-center">Stable</Badge>}
        {lt(info?.liquidity.toFixed(0) ?? 0, 100000) && (
          <Tooltip placement="right">
            <Icon size="sm" heroIconName="question-mark-circle" className="cursor-help" />
            <Tooltip.Panel>
              <div className="whitespace-pre">{lowLiquidityAlertText}</div>
            </Tooltip.Panel>
          </Tooltip>
        )}
      </Row>
    </AutoBox>
  )
}

function TextInfoItem({ name, value }: { name: string; value?: any }) {
  const isMobile = useAppSettings((s) => s.isMobile)
  return isMobile ? (
    <div>
      <div className="mb-1 text-[rgba(171,196,255,0.5)] font-medium text-2xs">{name}</div>
      <div className="text-xs">{value || '--'}</div>
    </div>
  ) : (
    <div className="tablet:text-sm">{value || '--'}</div>
  )
}
