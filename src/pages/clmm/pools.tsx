import { useCallback, useEffect, useMemo, useState } from 'react'

import { CurrencyAmount } from '@raydium-io/raydium-sdk'

import { twMerge } from 'tailwind-merge'

import useAppSettings from '@/application/common/useAppSettings'
import { isHydratedConcentratedItemInfo } from '@/application/concentrated/is'
import txHarvestConcentrated, { txHarvestAllConcentrated } from '@/application/concentrated/txHarvestConcentrated'
import { HydratedConcentratedInfo, UserPositionAccount } from '@/application/concentrated/type'
import useConcentrated, {
  PoolsConcentratedTabs, TimeBasis, useConcentratedFavoriteIds
} from '@/application/concentrated/useConcentrated'
import useConcentratedAmountCalculator from '@/application/concentrated/useConcentratedAmountCalculator'
import { useConcentratedPoolUrlParser } from '@/application/concentrated/useConcentratedPoolUrlParser'
import useConnection from '@/application/connection/useConnection'
import useNotification from '@/application/notification/useNotification'
import { usePools } from '@/application/pools/usePools'
import { routeTo } from '@/application/routeTools'
import { SplToken } from '@/application/token/type'
import useToken from '@/application/token/useToken'
import useWallet from '@/application/wallet/useWallet'
import { AddressItem } from '@/components/AddressItem'
import AutoBox from '@/components/AutoBox'
import Button from '@/components/Button'
import Card from '@/components/Card'
import CoinAvatar from '@/components/CoinAvatar'
import CoinAvatarPair from '@/components/CoinAvatarPair'
import Col from '@/components/Col'
import Collapse from '@/components/Collapse'
import CyberpunkStyleCard from '@/components/CyberpunkStyleCard'
import Grid from '@/components/Grid'
import Icon from '@/components/Icon'
import Input from '@/components/Input'
import Link from '@/components/Link'
import LinkExplorer from '@/components/LinkExplorer'
import List from '@/components/List'
import LoadingCircle from '@/components/LoadingCircle'
import PageLayout from '@/components/PageLayout'
import Popover from '@/components/Popover'
import RefreshCircle from '@/components/RefreshCircle'
import Row from '@/components/Row'
import RowTabs from '@/components/RowTabs'
import Select from '@/components/Select'
import Tooltip from '@/components/Tooltip'
import { addItem, removeItem, shakeFalsyItem } from '@/functions/arrayMethods'
import { getDate, toUTC } from '@/functions/date/dateFormat'
import { currentIsAfter, currentIsBefore } from '@/functions/date/judges'
import { getCountDownTime } from '@/functions/date/parseDuration'
import copyToClipboard from '@/functions/dom/copyToClipboard'
import formatNumber from '@/functions/format/formatNumber'
import { shrinkAccount } from '@/functions/format/shrinkAccount'
import toPubString from '@/functions/format/toMintString'
import toPercentString from '@/functions/format/toPercentString'
import toTotalPrice from '@/functions/format/toTotalPrice'
import toUsdVolume from '@/functions/format/toUsdVolume'
import { isMeaningfulNumber } from '@/functions/numberish/compare'
import { add, div, sub } from '@/functions/numberish/operations'
import { toString } from '@/functions/numberish/toString'
import { objectMap } from '@/functions/objectMethods'
import { searchItems } from '@/functions/searchItems'
import useConcentratedPendingYield from '@/hooks/useConcentratedPendingYield'
import useOnceEffect from '@/hooks/useOnceEffect'
import useSort from '@/hooks/useSort'
import { AprChart } from '@/pageComponents/Concentrated/AprChart'
import { ConcentratedModifyTooltipIcon } from '@/pageComponents/Concentrated/ConcentratedModifyTooltipIcon'
import MyPositionDialog from '@/pageComponents/Concentrated/MyPositionDialog'
import { AddConcentratedLiquidityDialog } from '@/pageComponents/dialogs/AddConcentratedLiquidityDialog'
import { RemoveConcentratedLiquidityDialog } from '@/pageComponents/dialogs/RemoveConcentratedLiquidityDialog'
import { Numberish } from '@/types/constants'

export default function PoolsConcentratedPage() {
  const currentTab = useConcentrated((s) => s.currentTab)
  useConcentratedPoolUrlParser()
  useConcentratedAmountCalculator()

  return (
    <PageLayout
      mobileBarTitle={{
        items: [
          { value: PoolsConcentratedTabs.ALL, barLabel: PoolsConcentratedTabs.ALL },
          { value: PoolsConcentratedTabs.MY_POOLS, barLabel: PoolsConcentratedTabs.MY_POOLS }
        ],
        currentValue: currentTab,
        onChange: (value) => useConcentrated.setState({ currentTab: value as PoolsConcentratedTabs }),
        urlSearchQueryKey: 'tab',
        drawerTitle: 'CONCENTRATED POOLS'
      }}
      metaTitle="Concentrated Pools - Raydium"
    >
      <PoolHeader />
      <PoolCard />
      <MyPositionDialog />
      <AddConcentratedLiquidityDialog />
      <RemoveConcentratedLiquidityDialog />
    </PageLayout>
  )
}

function PoolHeader() {
  const tvl = useConcentrated((s) => s.tvl)
  const volume24h = useConcentrated((s) => s.volume24h)
  const showTvlVolume24h = Boolean(tvl != null && volume24h != null)
  const isMobile = useAppSettings((s) => s.isMobile)
  return isMobile ? (
    showTvlVolume24h ? (
      <Row className="mx-auto my-2 text-base mobile:text-xs justify-self-start self-end text-[#abc4ff80] gap-4">
        <div className="whitespace-nowrap">
          TVL: <span className="font-medium text-[#abc4ff]">${formatNumber(tvl)}</span>
        </div>
        <div className="whitespace-nowrap">
          Volume24H: <span className="font-medium text-[#abc4ff]">${formatNumber(volume24h)}</span>
        </div>
      </Row>
    ) : null
  ) : (
    <Grid className="grid-cols-3 justify-between items-center pb-8 pt-0">
      <div>
        <div className="text-2xl font-semibold justify-self-start text-white">Concentrated Pools</div>
        {showTvlVolume24h && (
          <Row className="title text-base mobile:text-xs justify-self-start self-end text-[#abc4ff80] gap-4">
            <div className="whitespace-nowrap">
              TVL: <span className="font-medium text-[#abc4ff]">${formatNumber(tvl)}</span>
            </div>
            <div className="whitespace-nowrap">
              Volume24H: <span className="font-medium text-[#abc4ff]">${formatNumber(volume24h)}</span>
            </div>
          </Row>
        )}
      </div>
      <PoolsTabBlock />
      <PoolCreateConcentratedPoolEntryBlock />
    </Grid>
  )
}

function PoolsTabBlock({ className }: { className?: string }) {
  const currentTab = useConcentrated((s) => s.currentTab)
  const isMobile = useAppSettings((s) => s.isMobile)
  return isMobile ? (
    <RowTabs
      currentValue={currentTab}
      urlSearchQueryKey="tab"
      values={shakeFalsyItem([PoolsConcentratedTabs.ALL, PoolsConcentratedTabs.MY_POOLS] as const)}
      onChange={(tab) => useConcentrated.setState({ currentTab: tab })}
      className={className}
    />
  ) : (
    <RowTabs
      currentValue={currentTab}
      urlSearchQueryKey="tab"
      values={shakeFalsyItem([PoolsConcentratedTabs.ALL, PoolsConcentratedTabs.MY_POOLS] as const)}
      onChange={(tab) => useConcentrated.setState({ currentTab: tab })}
      className={twMerge('justify-self-center mobile:col-span-full', className)}
    />
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
                <PoolRefreshCircleBlock />
                <PoolTimeBasisSelectorBox />
                <HarvestAll />
                <PoolCreateConcentratedPoolEntryBlock />
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
  const storeSearchText = useConcentrated((s) => s.searchText)
  return (
    <Input
      value={storeSearchText}
      className={twMerge(
        'px-2 py-2 mobile:py-1 gap-2 ring-inset ring-1 ring-[rgba(196,214,255,0.5)] rounded-xl mobile:rounded-lg pc:w-[12vw] mobile:w-auto',
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
            useConcentrated.setState({ searchText: '' })
          }}
        />
      }
      placeholder="Search All"
      onUserInput={(searchText) => {
        useConcentrated.setState({ searchText })
      }}
    />
  )
}

function OpenNewPosition({ className }: { className?: string }) {
  const isMobile = useAppSettings((s) => s.isMobile)
  return (
    <Button
      className={twMerge('frosted-glass-teal mobile:text-2xs', className)}
      onClick={() => {
        routeTo('/clmm/create-position')
      }}
      size={isMobile ? 'xs' : 'sm'}
    >
      Create Position
    </Button>
  )
}

function HarvestAll() {
  const isApprovePanelShown = useAppSettings((s) => s.isApprovePanelShown)
  const walletConnected = useWallet((s) => s.connected)
  const refreshConcentrated = useConcentrated((s) => s.refreshConcentrated)
  const isMobile = useAppSettings((s) => s.isMobile)
  const hydratedAmmPools = useConcentrated((s) => s.hydratedAmmPools)

  const canHarvestAll = useMemo(() => {
    let result = false
    for (const pool of hydratedAmmPools) {
      if (pool.userPositionAccount && pool.userPositionAccount.length > 0) {
        result = true
        break
      }
    }

    return result
  }, [hydratedAmmPools])

  return (
    <Button
      className="frosted-glass-teal"
      isLoading={isApprovePanelShown}
      validators={[
        {
          should: walletConnected
        },
        { should: canHarvestAll }
      ]}
      onClick={() =>
        txHarvestAllConcentrated().then(({ allSuccess }) => {
          if (allSuccess) {
            refreshConcentrated()
          }
        })
      }
      size={isMobile ? 'xs' : 'sm'}
    >
      Harvest All
    </Button>
  )
}

function PoolLabelBlock({ className, sortedData }: { className?: string; sortedData: HydratedConcentratedInfo[] }) {
  return (
    <Row className={twMerge(className, 'flex justify-between items-center flex-wrap mr-4')}>
      <Col>
        <div className="font-medium text-xl mobile:text-base text-white">Concentrated Pools</div>
        <div className="font-medium text-[rgba(196,214,255,.5)] text-base mobile:text-sm">
          Concentrate liquidity for increased captial efficiency.{' '}
          <Link
            className="inline-block"
            href="https://docs.raydium.io/raydium/concentrated-liquidity/what-is-concentrated-liquidity"
          >
            Learn more
          </Link>
        </div>
      </Col>

      <Row className="gap-4 items-center">
        <HarvestAll />
        <PoolTimeBasisSelectorBox />
        <PoolSearchBlock className="h-[36px]" />
      </Row>
    </Row>
  )
}

function PoolTimeBasisSelectorBox({ className }: { className?: string }) {
  const timeBasis = useConcentrated((s) => s.timeBasis)
  return (
    <Select
      className={twMerge('z-20', className)}
      candidateValues={Object.values(TimeBasis)}
      localStorageKey="ui-time-basis"
      defaultValue={timeBasis}
      prefix="Time Basis:"
      onChange={(newSortKey) => {
        useConcentrated.setState({ timeBasis: newSortKey ?? TimeBasis.WEEK })
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
  const timeBasis = useConcentrated((s) => s.timeBasis)
  return (
    <Select
      className={className}
      candidateValues={[
        { label: 'Pool', value: 'name' },
        { label: 'Liquidity', value: 'liquidity' },
        {
          label: `Volume ${timeBasis}`,
          value: timeBasis === TimeBasis.DAY ? 'volume24h' : timeBasis === TimeBasis.WEEK ? 'volume7d' : 'volume30d'
        },
        {
          label: `Fees ${timeBasis}`,
          value: timeBasis === TimeBasis.DAY ? 'fee24h' : timeBasis === TimeBasis.WEEK ? 'fee7d' : 'fee30d'
        },
        {
          label: `APR ${timeBasis}`,
          value: timeBasis === TimeBasis.DAY ? 'apr24h' : timeBasis === TimeBasis.WEEK ? 'apr7d' : 'apr30d'
        },
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
  const refreshConcentrated = useConcentrated((s) => s.refreshConcentrated)

  return useMemo(() => {
    if (isMobile) {
      return (
        <Row className={twMerge('items-center', className)}>
          <span className="text-[rgba(196,214,255,0.5)] font-medium text-sm mobile:text-xs">Refresh Pools</span>
          <RefreshCircle
            refreshKey="pools"
            freshFunction={() => {
              refreshConcentrated()
            }}
          />
        </Row>
      )
    }

    return (
      <div className={twMerge('justify-self-end', className)}>
        <RefreshCircle
          refreshKey="pools"
          freshFunction={() => {
            refreshConcentrated()
          }}
        />
      </div>
    )
  }, [isMobile, refreshConcentrated])
}

function PoolCreateConcentratedPoolEntryBlock({ className }: { className?: string }) {
  const isInLocalhost = useAppSettings((s) => s.isInLocalhost)
  const isInBonsaiTest = useAppSettings((s) => s.isInBonsaiTest)
  if (!isInLocalhost && !isInBonsaiTest) return null
  return (
    <Row
      className={twMerge(
        `justify-self-end mobile:justify-self-auto gap-1 py-1 flex-wrap items-center opacity-100 pointer-events-auto clickable transition`,
        className
      )}
      onClick={() => {
        routeTo('/clmm/create-pool')
      }}
    >
      <Icon heroIconName="plus-circle" className="text-[#abc4ff] mobile:text-[#abc4ff80]" size="sm" />
      <span className="text-[#abc4ff] mobile:text-[#abc4ff80] font-medium text-sm mobile:text-xs">
        Create Concentrated Pool
      </span>
    </Row>
  )
}

function PoolCard() {
  const hydratedAmmPools = useConcentrated((s) => s.hydratedAmmPools)
  const searchText = useConcentrated((s) => s.searchText)
  const timeBasis = useConcentrated((s) => s.timeBasis)
  const aprCalcMode = useConcentrated((s) => s.aprCalcMode)
  const currentTab = useConcentrated((s) => s.currentTab)

  const isMobile = useAppSettings((s) => s.isMobile)
  const [favouriteIds] = useConcentratedFavoriteIds()

  const dataSource = useMemo(
    () =>
      hydratedAmmPools.filter((pool) => {
        if (currentTab === PoolsConcentratedTabs.MY_POOLS) {
          return pool.userPositionAccount !== undefined ? true : false
        }
        return true
      }),
    [searchText, hydratedAmmPools, currentTab]
  )

  const searched = useMemo(
    () =>
      searchItems(dataSource, {
        text: searchText,
        matchConfigs: (i) => [
          { text: i.idString, entirely: false },
          { text: toPubString(i.base?.mint), entirely: true },
          { text: toPubString(i.quote?.mint), entirely: true },
          i.base?.symbol,
          i.quote?.symbol,
          i.base?.name,
          i.quote?.name
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
    defaultSort: { key: 'defaultKey', sortCompare: [(i) => favouriteIds?.includes(i.idString)] }
  })

  // re-sort when favourite have loaded
  useOnceEffect(
    ({ runed }) => {
      if (favouriteIds !== undefined) runed()
      if (favouriteIds != null) {
        setSortConfig({
          key: 'init',
          sortCompare: [(i) => favouriteIds?.includes(i.idString)],
          mode: 'decrease'
        })
        runed()
      }
    },
    [favouriteIds]
  )

  const TableHeaderBlock = useMemo(
    () => (
      <Row
        type="grid-x"
        className="mb-3 h-12 justify-between sticky -top-6 backdrop-filter z-10 backdrop-blur-md bg-[rgba(20,16,65,0.2)] mr-scrollbar rounded-xl mobile:rounded-lg gap-2 grid-cols-[auto,1.6fr,1fr,1fr,1fr,1fr,.8fr,auto]"
      >
        <Row
          className="group w-20 pl-10 font-medium text-[#ABC4FF] text-sm items-center cursor-pointer  clickable clickable-filter-effect no-clicable-transform-effect"
          onClick={() => {
            setSortConfig({
              key: 'favorite',
              sortModeQueue: ['decrease', 'none'],
              sortCompare: [(i) => favouriteIds?.includes(i.idString), (i) => i.tvl]
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
            setSortConfig({ key: 'liquidity', sortCompare: (i) => i.tvl })
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
            const key =
              timeBasis === TimeBasis.DAY ? 'volume24h' : timeBasis === TimeBasis.WEEK ? 'volume7d' : 'volume30d'
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
            const key = timeBasis === TimeBasis.DAY ? 'fee24h' : timeBasis === TimeBasis.WEEK ? 'fee7d' : 'fee30d'
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

        <Row className="font-medium text-[#ABC4FF] text-sm items-center cursor-pointer clickable clickable-filter-effect no-clicable-transform-effect">
          Rewards
          {/* <Icon
            className="ml-1"
            size="sm"
            iconSrc={
              sortConfig?.key.startsWith('fee') && sortConfig.mode !== 'none'
                ? sortConfig?.mode === 'decrease'
                  ? '/icons/msic-sort-down.svg'
                  : '/icons/msic-sort-up.svg'
                : '/icons/msic-sort.svg'
            }
          /> */}
        </Row>

        {/* table head column: volume24h */}
        <Row
          className="font-medium text-[#ABC4FF] text-sm items-center cursor-pointer clickable clickable-filter-effect no-clicable-transform-effect"
          onClick={() => {
            setSortConfig({
              key: 'apr',
              sortCompare: (i) =>
                i.state[timeBasis === TimeBasis.DAY ? 'day' : timeBasis === TimeBasis.WEEK ? 'week' : 'month'].apr
            })
          }}
        >
          APR {timeBasis}
          <Tooltip>
            <Icon className="ml-1 cursor-help" size="sm" heroIconName="question-mark-circle" />
            <Tooltip.Panel className="max-w-[250px]">
              This is the estimated APR for the whole pool. Your actual APR will vary according to the price range you
              select.
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
    [sortConfig, timeBasis, aprCalcMode]
  )

  // NOTE: filter widgets
  const innerPoolDatabaseWidgets = isMobile ? (
    <div>
      <Row className="mb-4">
        <Grid className="grow gap-2 grid-cols-auto-fit">
          <PoolSearchBlock />
          <PoolTableSorterBox
            onChange={(newSortKey) => {
              newSortKey
                ? setSortConfig({
                    key: newSortKey,
                    sortCompare:
                      newSortKey === 'favorite' ? (i) => favouriteIds?.includes(i.idString) : (i) => i[newSortKey]
                  })
                : clearSortConfig()
            }}
          />
        </Grid>
        <ToolsButton className="self-center" />
      </Row>
    </div>
  ) : (
    <div>
      <Row className={'w-full justify-between pb-5 items-center'}>
        <PoolLabelBlock className="flex-grow" sortedData={sortedData} />
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
      {!isMobile && TableHeaderBlock}
      <PoolCardDatabaseBody sortedData={sortedData} />
    </CyberpunkStyleCard>
  )
}
function PoolCardDatabaseBody({ sortedData }: { sortedData: HydratedConcentratedInfo[] }) {
  const loading = useConcentrated((s) => s.loading)
  const expandedItemIds = useConcentrated((s) => s.expandedItemIds)
  const [favouriteIds, setFavouriteIds] = useConcentratedFavoriteIds()
  return sortedData.length ? (
    <List className="gap-3 mobile:gap-2 text-[#ABC4FF] flex-1 -mx-2 px-2" /* let scrollbar have some space */>
      {sortedData.map((info) => (
        <List.Item key={info.idString}>
          <Collapse open={expandedItemIds.has(info.idString)}>
            <Collapse.Face>
              {(open) => (
                <PoolCardDatabaseBodyCollapseItemFace
                  open={open}
                  info={info}
                  isFavourite={favouriteIds?.includes(info.idString)}
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
  info: HydratedConcentratedInfo
  isFavourite?: boolean
  onUnFavorite?: (ammId: string) => void
  onStartFavorite?: (ammId: string) => void
}) {
  const isMobile = useAppSettings((s) => s.isMobile)
  const isTablet = useAppSettings((s) => s.isTablet)
  const timeBasis = useConcentrated((s) => s.timeBasis)
  const tokenListSettings = useToken((s) => s.tokenListSettings)
  const unnamedTokenMints = tokenListSettings['UnNamed Token List'].mints
  const { lpPrices } = usePools()
  const tokenPrices = useToken((s) => s.tokenPrices)
  const variousPrices = useMemo(() => ({ ...lpPrices, ...tokenPrices }), [lpPrices, tokenPrices])

  const rewardsBadge = useMemo(() => {
    const badges = info.rewardInfos.map((reward, idx) => {
      const isRewardEnd = currentIsAfter(reward.endTime)
      const isRewardBeforeStart = currentIsBefore(reward.openTime)
      const isRewardBefore24H = currentIsAfter(reward.openTime - 86400 * 1000)

      return (
        <Tooltip key={`${info.idString}-reward-badge-id-${idx}`}>
          <Row
            className={`ring-1 ring-inset ring-[#abc4ff80] p-1 mobile:p-[1px] rounded-full items-center gap-2 overflow-hidden ${
              isRewardEnd ? 'opacity-30 contrast-40' : isRewardBeforeStart ? 'opacity-50' : ''
            } `}
          >
            <div className="relative">
              <CoinAvatar
                size={isMobile ? 'xs' : 'smi'}
                token={reward.rewardToken}
                className={isRewardBeforeStart ? 'blur-sm' : ''}
              />
              {isRewardEnd && (
                <div className="absolute h-[1.5px] w-full top-1/2 -translate-y-1/2 rotate-45 bg-[#abc4ff80] scale-x-125"></div>
              )}
              {isRewardBeforeStart && (
                <div className="absolute top-1/2 -translate-y-1/2 opacity-70">
                  <Icon heroIconName="dots-horizontal" size={isMobile ? 'sm' : 'md'} />
                </div>
              )}
            </div>
          </Row>
          <Tooltip.Panel>
            <div key={`${info.idString}-reward-detail-content-id-${idx}`}>
              <Row className="text-sm justify-between items-center min-w-[260px] gap-4">
                <Row className="gap-1.5 items-center">
                  <CoinAvatar size={isMobile ? 'xs' : 'smi'} token={reward.rewardToken} />
                  {isRewardEnd ? null : (
                    <>
                      <span className="text-white">{formatNumber(toString(reward.rewardPerWeek))}</span>
                      <span className="text-[#ABC4FF]">{reward.rewardToken?.symbol ?? '--'} per week</span>
                    </>
                  )}
                </Row>
                {isRewardEnd ? null : (
                  <span className="text-white/50">
                    {toUsdVolume(
                      toTotalPrice(reward.rewardPerWeek, variousPrices[toPubString(reward.rewardToken?.mint)] ?? null),
                      { decimalPlace: 0 }
                    )}
                  </span>
                )}
              </Row>
              <div className="mb-1 mt-1">
                {reward.openTime &&
                  reward.endTime &&
                  (isRewardEnd ? 'Reward Ended' : isRewardBeforeStart ? 'Reward Not Started' : 'Reward Period')}
              </div>
              {reward.openTime && isRewardBeforeStart && isRewardBefore24H && (
                <div className="opacity-50">Start in {getCountDownTime(getDate(reward.openTime))}</div>
              )}
              {reward.openTime && reward.endTime && (
                <div className="opacity-50">
                  {toUTC(reward.openTime, { hideHourMinuteSecond: true })} ~{' '}
                  {toUTC(reward.endTime, { hideHourMinuteSecond: true })}
                </div>
              )}
              {reward.tokenMint && (
                <AddressItem
                  showDigitCount={6}
                  addressType="token"
                  canCopy
                  canExternalLink
                  textClassName="text-xs"
                  className="w-full opacity-50 mt-2 contrast-75"
                >
                  {toPubString(reward.tokenMint)}
                </AddressItem>
              )}
              {unnamedTokenMints?.has(toPubString(reward.tokenMint)) && (
                <div className="max-w-[300px] mt-2">
                  This token does not currently have a ticker symbol. Check the mint address to ensure it is the token
                  you want to transact with.
                </div>
              )}
            </div>
          </Tooltip.Panel>
        </Tooltip>
      )
    })

    return (
      <div className={twMerge(`flex flex-wrap justify-start items-center gap-2`, badges.length === 0 ? 'h-4' : '')}>
        {badges}
      </div>
    )
  }, [info.idString, info.rewardInfos, isMobile, variousPrices])

  const apr = isHydratedConcentratedItemInfo(info)
    ? timeBasis === TimeBasis.DAY
      ? { total: info.totalApr24h, itemList: [info.feeApr24h, ...info.rewardApr24h] }
      : timeBasis === TimeBasis.WEEK
      ? { total: info.totalApr7d, itemList: [info.feeApr7d, ...info.rewardApr7d] }
      : { total: info.totalApr30d, itemList: [info.feeApr30d, ...info.rewardApr30d] }
    : undefined

  const pcCotent = (
    <Row
      type="grid-x"
      className={`py-5 mobile:py-4 mobile:px-5 bg-[#141041] items-center gap-2 grid-cols-[auto,1.6fr,1fr,1fr,1fr,1fr,.8fr,auto] mobile:grid-cols-[1fr,1fr,1fr,auto] rounded-t-3xl mobile:rounded-t-lg ${
        open ? '' : 'rounded-b-3xl mobile:rounded-b-lg'
      } transition-all`}
    >
      <div className="w-12 self-center ml-6 mr-2">
        {isFavourite ? (
          <Icon
            iconSrc="/icons/misc-star-filled.svg"
            onClick={({ ev }) => {
              ev.stopPropagation()
              onUnFavorite?.(info.idString)
            }}
            className="clickable clickable-mask-offset-2 m-auto self-center"
          />
        ) : (
          <Icon
            iconSrc="/icons/misc-star-empty.svg"
            onClick={({ ev }) => {
              ev.stopPropagation()
              onStartFavorite?.(info.idString)
            }}
            className="clickable clickable-mask-offset-2 opacity-30 hover:opacity-80 transition m-auto self-center"
          />
        )}
      </div>

      <CoinAvatarInfoItem info={info} className="pl-0" />

      <TextInfoItem
        name="Liquidity"
        value={
          isHydratedConcentratedItemInfo(info)
            ? toUsdVolume(info.tvl, { autoSuffix: isTablet, decimalPlace: 0 })
            : undefined
        }
      />
      <TextInfoItem
        name={`Volume(${timeBasis})`}
        value={
          isHydratedConcentratedItemInfo(info)
            ? timeBasis === TimeBasis.DAY
              ? toUsdVolume(info.volume24h, { autoSuffix: isTablet, decimalPlace: 0 })
              : timeBasis === TimeBasis.WEEK
              ? toUsdVolume(info.volume7d, { autoSuffix: isTablet, decimalPlace: 0 })
              : toUsdVolume(info.volume30d, { autoSuffix: isTablet, decimalPlace: 0 })
            : undefined
        }
      />
      <TextInfoItem
        name={`Fees(${timeBasis})`}
        value={
          isHydratedConcentratedItemInfo(info)
            ? timeBasis === TimeBasis.DAY
              ? toUsdVolume(info.volumeFee24h, { autoSuffix: isTablet, decimalPlace: 0 })
              : timeBasis === TimeBasis.WEEK
              ? toUsdVolume(info.volumeFee7d, { autoSuffix: isTablet, decimalPlace: 0 })
              : toUsdVolume(info.volumeFee30d, { autoSuffix: isTablet, decimalPlace: 0 })
            : undefined
        }
      />
      <TextInfoItem name={`Rewards`} value={rewardsBadge} />
      <TextInfoItem
        name={`APR(${timeBasis})`}
        value={
          <div style={{ display: 'inline-block' }}>
            <Tooltip panelClassName="p-0 rounded-xl">
              <div>
                {toPercentString(apr?.total)}
                <Row className="items-center gap-2 mobile:gap-1 mt-1">
                  {apr && <AprLine className="w-28" aprValues={apr.itemList} />}
                </Row>
              </div>
              <Tooltip.Panel>
                <div className="p-5">
                  <AprChart type="poolInfo" poolInfo={info} />
                </div>
              </Tooltip.Panel>
            </Tooltip>
          </div>
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
                  onUnFavorite?.(info.idString)
                }}
                size="sm"
              />
            ) : (
              <Icon
                className="clickable opacity-30 hover:opacity-80 transition clickable-mask-offset-2 m-auto self-center"
                iconSrc="/icons/misc-star-empty.svg"
                onClick={({ ev }) => {
                  ev.stopPropagation()
                  onStartFavorite?.(info.idString)
                }}
                size="sm"
              />
            )}
          </div>

          <CoinAvatarInfoItem info={info} />

          <TextInfoItem
            name="Liquidity"
            value={
              isHydratedConcentratedItemInfo(info)
                ? toUsdVolume(info.tvl, { autoSuffix: true, decimalPlace: 1 })
                : undefined
            }
          />
          <TextInfoItem name="Rewards" value={rewardsBadge} />
          <TextInfoItem name={`APR(${timeBasis})`} value={toPercentString(apr?.total)} />

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
              isHydratedConcentratedItemInfo(info)
                ? toUsdVolume(info.volume7d, { autoSuffix: true, decimalPlace: 0 })
                : undefined
            }
          />
          <TextInfoItem
            name="Volume(24h)"
            value={
              isHydratedConcentratedItemInfo(info)
                ? toUsdVolume(info.volume24h, { autoSuffix: true, decimalPlace: 0 })
                : undefined
            }
          />
          <TextInfoItem
            name="Fees(7d)"
            value={
              isHydratedConcentratedItemInfo(info)
                ? toUsdVolume(info.volumeFee7d, { autoSuffix: true, decimalPlace: 0 })
                : undefined
            }
          />

          <Grid className="w-6 h-6 place-items-center"></Grid>
        </Row>
      </Collapse.Body>
    </Collapse>
  )

  return isMobile ? mobileContent : pcCotent
}

function AprLine({ className, aprValues }: { className?: string; aprValues: Numberish[] | undefined }) {
  const colors = ['#abc4ff', '#39d0d8', '#2b6aff']
  if (!aprValues) return null
  const totalApr = aprValues.reduce((a, b) => add(a, b), 0)
  return (
    <Row className={twMerge('w-full gap-1', className)}>
      {aprValues
        .filter((i) => isMeaningfulNumber(i))
        .map((aprValue, idx) => (
          <div
            key={idx}
            className="h-2 rounded-full"
            style={{
              width: toPercentString(div(aprValue, totalApr)),
              backgroundColor: colors[idx]
            }}
          ></div>
        ))}
    </Row>
  )
}

function PoolCardDatabaseBodyCollapseItemContent({ poolInfo: info }: { poolInfo: HydratedConcentratedInfo }) {
  // eslint-disable-next-line no-console
  // console.log('info: ', info)

  const { lpPrices } = usePools()
  const tokenPrices = useToken((s) => s.tokenPrices)

  const variousPrices = useMemo(() => ({ ...lpPrices, ...tokenPrices }), [lpPrices, tokenPrices])

  const openNewPosition = useMemo(() => {
    return (
      <Col className={`py-5 px-8 mobile:py-2 justify-center rounded-b-3xl mobile:rounded-b-lg items-center`}>
        <div className="mb-2 text-xs">Want to open a new position?</div>
        <Row className={`justify-center items-center gap-2`}>
          <Button
            className="frosted-glass-teal mobile:px-6 mobile:py-2 mobile:text-xs"
            onClick={() => {
              useConcentrated.setState({
                coin1: info.base,
                coin2: info.quote,
                chartPoints: [],
                lazyLoadChart: true,
                currentAmmPool: info
              })
              routeTo('/clmm/create-position')
            }}
          >
            Create Position
          </Button>
          <Tooltip>
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
            <Tooltip.Panel>Swap</Tooltip.Panel>
          </Tooltip>
        </Row>
      </Col>
    )
  }, [info])

  return (
    <AutoBox
      is={'Col'}
      className={`justify-between rounded-b-3xl mobile:rounded-b-lg`}
      style={{
        background: 'linear-gradient(126.6deg, rgba(171, 196, 255, 0.12), rgb(171 196 255 / 4%) 100%)'
      }}
    >
      {info.userPositionAccount ? (
        <>
          {info.userPositionAccount
            .sort((a: UserPositionAccount, b: UserPositionAccount) =>
              Number(
                toString(
                  sub(
                    a.getLiquidityVolume?.(tokenPrices).wholeLiquidity,
                    b.getLiquidityVolume?.(tokenPrices).wholeLiquidity
                  )
                )
              )
            )
            .map((p) => {
              let myPosition = '--'
              const amountA = toString(p.amountA, { decimalLength: 'auto 5' })
              const amountB = toString(p.amountB, { decimalLength: 'auto 5' })
              const lower = toString(p.priceLower, { decimalLength: `auto ${p.tokenB?.decimals ?? 5}` })
              const upper = toString(p.priceUpper, { decimalLength: `auto ${p.tokenB?.decimals ?? 5}` })

              if (lower && upper) {
                myPosition = lower + ' - ' + upper
              }

              const coinAPrice = toTotalPrice(p.amountA, variousPrices[toPubString(p.tokenA?.mint)] ?? null)
              const coinBPrice = toTotalPrice(p.amountB, variousPrices[toPubString(p.tokenB?.mint)] ?? null)

              const { wholeLiquidity } = p.getLiquidityVolume?.(tokenPrices) ?? {}

              const coinARewardPrice = toTotalPrice(
                p.tokenFeeAmountA,
                variousPrices[toPubString(p.tokenA?.mint)] ?? null
              )
              const coinBRewardPrice = toTotalPrice(
                p.tokenFeeAmountB,
                variousPrices[toPubString(p.tokenB?.mint)] ?? null
              )
              const rewardTotalPrice = coinARewardPrice.add(coinBRewardPrice)
              const rewardTotalVolume = rewardTotalPrice ? toUsdVolume(rewardTotalPrice) : '--'

              const rewardInfoPrice = new Map<SplToken, CurrencyAmount>()
              p.rewardInfos.forEach((rInfo) => {
                if (rInfo.token) {
                  rewardInfoPrice.set(
                    rInfo.token,
                    toTotalPrice(rInfo.penddingReward, variousPrices[toPubString(rInfo.token.mint)] ?? null)
                  )
                }
              })

              return (
                <PoolCardDatabaseBodyCollapsePositionContent
                  key={p.nftMint.toString()}
                  poolInfo={info}
                  userPositionAccount={p}
                  myPosition={myPosition}
                  amountA={amountA}
                  amountB={amountB}
                  myPositionVolume={toUsdVolume(wholeLiquidity)}
                  coinAPrice={coinAPrice}
                  coinBPrice={coinBPrice}
                  inRange={p.inRange}
                  rewardAPrice={coinARewardPrice}
                  rewardBPrice={coinBRewardPrice}
                  rewardInfoPrice={rewardInfoPrice}
                />
              )
            })}

          <AutoBox>{openNewPosition}</AutoBox>
        </>
      ) : (
        <AutoBox>{openNewPosition}</AutoBox>
      )}
    </AutoBox>
  )
}

function PoolCardDatabaseBodyCollapsePositionContent({
  poolInfo: info,
  userPositionAccount: p,
  myPosition: myPosition,
  amountA,
  amountB,
  myPositionVolume,
  coinAPrice,
  coinBPrice,
  inRange,
  rewardAPrice,
  rewardBPrice,
  rewardInfoPrice
}: {
  poolInfo: HydratedConcentratedInfo
  userPositionAccount?: UserPositionAccount
  myPosition?: string
  amountA?: string
  amountB?: string
  myPositionVolume?: string
  coinAPrice?: CurrencyAmount
  coinBPrice?: CurrencyAmount
  inRange?: boolean
  rewardAPrice?: CurrencyAmount
  rewardBPrice?: CurrencyAmount
  rewardInfoPrice?: Map<SplToken, CurrencyAmount>
}) {
  const isMobile = useAppSettings((s) => s.isMobile)
  const isApprovePanelShown = useAppSettings((s) => s.isApprovePanelShown)
  const unclaimedYield = useConcentratedPendingYield(p)
  const refreshConcentrated = useConcentrated((s) => s.refreshConcentrated)
  const logInfo = useNotification((s) => s.logInfo)
  const walletConnected = useWallet((s) => s.connected)

  const rangeTag = useMemo(() => {
    let bgColor = 'bg-[#142B45]'
    let textColor = 'text-[#39D0D8]'
    let iconSrc = '/icons/check-circle.svg'
    let textValue = 'In Range'
    if (!inRange) {
      bgColor = 'bg-[#DA2EEF]/10'
      textColor = 'text-[#DA2EEF]'
      iconSrc = '/icons/warn-stick.svg'
      textValue = 'Out of Range'
    }

    return (
      <Tooltip darkGradient={true} panelClassName="p-0 rounded-xl">
        <Row className={twMerge('items-center rounded text-xs mobile:text-2xs py-0.5 px-1 ml-2', bgColor, textColor)}>
          <Icon size="xs" iconSrc={iconSrc} />
          <div className="font-normal" style={{ marginLeft: 4 }}>
            {textValue}
          </div>
        </Row>
        <Tooltip.Panel>
          <div className="max-w-[300px] py-3 px-5">
            <div className="font-medium text-[#ABC4FF] text-2xs">Current Price</div>
            <Row className="gap-5  mt-1">
              <div className="text-xs text-white">{toString(info.currentPrice, { decimalLength: 'auto 5' })}</div>
              <div className="text-[#ABC4FF] text-xs">
                {info.quote?.symbol} per {info.base?.symbol}
              </div>
            </Row>
          </div>
        </Tooltip.Panel>
      </Tooltip>
    )
  }, [inRange, info.currentPrice, info.base?.symbol, info.quote?.symbol])

  return (
    <AutoBox is={isMobile ? 'Col' : 'Row'}>
      <Row className={`w-full pt-5 px-8 mobile:py-3 mobile:px-2 mobile:m-0`}>
        <div
          className={`flex w-full pb-5 ${isMobile ? 'flex-col' : 'flex-row'}`}
          style={{ borderBottom: '1px solid rgba(171, 196, 255, .1)' }}
        >
          <AutoBox
            is={isMobile ? 'Col' : 'Row'}
            className={`gap-[8px] mobile:gap-3 mobile:grid-cols-2-auto flex-grow justify-between`}
          >
            <AutoBox
              is={isMobile ? 'div' : 'Row'}
              className={`${
                !isMobile ? 'grid grid-cols-5' : 'flex-auto justify-between'
              } w-1/2 mobile:w-full ring-inset ring-1 ring-[rgba(196,214,255,0.5)] rounded-3xl mobile:rounded-lg p-6 mobile:p-3  items-center`}
            >
              <Col
                className={`${!isMobile ? 'col-span-2' : ''} mobile:mb-2 mobile:pb-2`}
                style={{ borderBottom: isMobile ? '1px solid rgba(171, 196, 255, .1)' : 'none' }}
              >
                <div className="flex justify-start mobile:justify-between text-[rgba(171,196,255,0.5)] font-medium text-sm mobile:text-xs">
                  Price Range {p ? rangeTag : null}
                </div>
                <div className="text-white font-medium text-base mobile:text-sm mt-3 mobile:mt-1">
                  {myPosition ?? '--'}
                </div>
                <div className=" text-[rgba(171,196,255,0.5)] font-medium text-sm mobile:text-2xs mt-2 mobile:mt-1">
                  {info.quote?.symbol} per {info.base?.symbol}
                </div>
              </Col>
              <Col className={`${!isMobile ? 'col-span-2' : ''}`}>
                <div className="flex justify-start items-center text-[rgba(171,196,255,0.5)] font-medium text-sm mobile:text-xs gap-1">
                  My Position
                  {p ? (
                    <Tooltip darkGradient={true} panelClassName="p-0 rounded-xl">
                      <Icon className=" cursor-help" size="sm" heroIconName="question-mark-circle" />
                      <Tooltip.Panel>
                        <div className="max-w-[300px] py-3 px-5">
                          {info.base && (
                            <TokenPositionInfo token={info.base} tokenAmount={amountA} tokenPrice={coinAPrice} />
                          )}
                          {info.quote && (
                            <TokenPositionInfo token={info.quote} tokenAmount={amountB} tokenPrice={coinBPrice} />
                          )}
                        </div>
                      </Tooltip.Panel>
                    </Tooltip>
                  ) : null}
                </div>
                <div className="text-white font-medium text-base mobile:text-sm mt-3 mobile:mt-1">
                  {myPositionVolume ?? '--'}
                </div>
                <Row className="items-center gap-1 text-[rgba(171,196,255,0.5)] font-medium text-sm mobile:text-2xs mt-2 mobile:mt-1">
                  {p ? (
                    <>
                      {' '}
                      {shrinkAccount(p?.nftMint, 6)}{' '}
                      <Icon
                        size="sm"
                        className={'clickable text-[rgba(171,196,255,1)] font-semibold'}
                        heroIconName="clipboard-copy"
                        onClick={({ ev }) => {
                          ev.stopPropagation()
                          copyToClipboard(toPubString(p?.nftMint))
                          logInfo('Account has been copied!')
                        }}
                      />
                      <LinkExplorer className="flex items-center" hrefDetail={`${p?.nftMint}`} type="account">
                        <Icon
                          size="sm"
                          className={'clickable text-[rgba(171,196,255,1)] font-semibold'}
                          inline
                          heroIconName="external-link"
                        />
                      </LinkExplorer>
                    </>
                  ) : (
                    <>&nbsp;</>
                  )}
                </Row>
              </Col>
              <AutoBox
                is={isMobile ? 'Row' : 'Col'}
                className={isMobile ? 'flex justify-center items-center pt-3' : 'col-span-1'}
              >
                <div className="flex justify-end shrink">
                  <Button
                    className="frosted-glass-teal"
                    size={isMobile ? 'xs' : undefined}
                    disabled={!p}
                    validators={[
                      {
                        should: walletConnected,
                        forceActive: true,
                        fallbackProps: {
                          onClick: () => useAppSettings.setState({ isWalletSelectorShown: true }),
                          children: 'Connect Wallet'
                        }
                      },
                      {
                        should: p,
                        forceActive: true,
                        fallbackProps: {
                          onClick: () => {
                            useConcentrated.setState({ coin1: info.base, coin2: info.quote, currentAmmPool: info })
                            routeTo('/clmm/create-position', {
                              queryProps: {}
                            })
                          },
                          children: 'Create Position'
                        }
                      }
                    ]}
                    onClick={() => {
                      useConcentrated.setState({
                        isMyPositionDialogOpen: true,
                        currentAmmPool: info,
                        targetUserPositionAccount: p,
                        coin1: info.base,
                        coin2: info.quote
                      })
                    }}
                  >
                    Manage
                  </Button>
                </div>
              </AutoBox>
            </AutoBox>
            <AutoBox
              is={isMobile ? 'div' : 'Row'}
              className="flex-auto w-1/2 mobile:w-full justify-between ring-inset ring-1 ring-[rgba(196,214,255,0.5)] rounded-3xl mobile:rounded-lg p-6 mobile:p-3  items-center"
            >
              <Col>
                <div className="flex justify-start items-center text-[rgba(171,196,255,0.5)] font-medium text-sm mobile:text-2xs gap-1">
                  Pending Yield
                  {p ? (
                    <Tooltip darkGradient={true} panelClassName="p-0 rounded-xl">
                      <Icon className="cursor-help" size="sm" heroIconName="question-mark-circle" />
                      <Tooltip.Panel>
                        <div className="min-w-[250px] py-[6px] px-5">
                          {p.tokenFeeAmountA || p.tokenFeeAmountB ? <div className="pt-3 pb-1">Fees</div> : null}
                          {info.base && (
                            <TokenPositionInfo
                              token={info.base}
                              tokenAmount={toString(p.tokenFeeAmountA, { decimalLength: 'auto 5' })}
                              tokenPrice={rewardAPrice}
                              suffix=""
                            />
                          )}
                          {info.quote && (
                            <TokenPositionInfo
                              token={info.quote}
                              tokenAmount={toString(p.tokenFeeAmountB, { decimalLength: 'auto 5' })}
                              tokenPrice={rewardBPrice}
                              suffix=""
                            />
                          )}
                          {p.rewardInfos.length > 0 ? <div className="pt-3 pb-1">Rewards</div> : null}
                          {p.rewardInfos &&
                            p.rewardInfos.map((rInfo, rIdx) => (
                              <TokenPositionInfo
                                key={`personal-rewardInfo-reward-${rIdx}-${toPubString(rInfo.token?.mint)}`}
                                token={rInfo.token}
                                tokenAmount={toString(rInfo.penddingReward, { decimalLength: 'auto 5' })}
                                tokenPrice={rInfo.token && rewardInfoPrice?.get(rInfo.token)}
                                suffix=""
                              />
                            ))}
                        </div>
                      </Tooltip.Panel>
                    </Tooltip>
                  ) : null}
                </div>
                <div className="text-white font-medium text-base mobile:text-sm mt-3 mobile:mt-1">
                  ≈{toUsdVolume(unclaimedYield)}
                </div>
                {p && <PositionAprIllustrator poolInfo={info} positionInfo={p}></PositionAprIllustrator>}
              </Col>
              <AutoBox
                is={isMobile ? 'Row' : 'Col'}
                className={isMobile ? 'flex justify-center items-center pt-3' : ''}
              >
                <Button
                  className="frosted-glass-teal "
                  size={isMobile ? 'xs' : undefined}
                  isLoading={isApprovePanelShown}
                  validators={[
                    {
                      should: walletConnected,
                      forceActive: true,
                      fallbackProps: {
                        onClick: () => useAppSettings.setState({ isWalletSelectorShown: true }),
                        children: 'Connect Wallet'
                      }
                    },
                    { should: isMeaningfulNumber(unclaimedYield) }
                  ]}
                  onClick={() =>
                    txHarvestConcentrated({ currentAmmPool: info, targetUserPositionAccount: p }).then(
                      ({ allSuccess }) => {
                        if (allSuccess) {
                          refreshConcentrated()
                        }
                      }
                    )
                  }
                >
                  Harvest
                </Button>
              </AutoBox>
            </AutoBox>
          </AutoBox>
          <Row
            className={`pl-8 ${
              isMobile ? 'pr-8 pt-5' : ''
            }   gap-3 items-center self-center justify-center mobile:w-full`}
          >
            {isMobile ? (
              <Row className="gap-5 mobile:gap-4">
                <Icon
                  size="sm"
                  heroIconName="plus"
                  className={`grid place-items-center w-10 h-10 mobile:w-8 mobile:h-8 ring-inset ring-1 mobile:ring-1 ring-[rgba(171,196,255,.5)] rounded-xl mobile:rounded-lg text-[rgba(171,196,255,.5)] opacity-100 clickable clickable-filter-effect ${
                    p ? 'opacity-100 clickable clickable-filter-effect' : 'opacity-50 not-clickable'
                  }`}
                  onClick={() => {
                    useConcentrated.setState({
                      isAddDialogOpen: true,
                      currentAmmPool: info,
                      targetUserPositionAccount: p
                    })
                  }}
                />
                <Icon
                  size="sm"
                  iconSrc="/icons/pools-remove-liquidity-entry.svg"
                  className={`grid place-items-center w-10 h-10 mobile:w-8 mobile:h-8 ring-inset ring-1 mobile:ring-1 ring-[rgba(171,196,255,.5)] rounded-xl mobile:rounded-lg text-[rgba(171,196,255,.5)] ${
                    p ? 'opacity-100 clickable clickable-filter-effect' : 'opacity-50 not-clickable'
                  }`}
                  onClick={() => {
                    useConcentrated.setState({
                      isRemoveDialogOpen: true,
                      currentAmmPool: info,
                      targetUserPositionAccount: p
                    })
                  }}
                />
              </Row>
            ) : (
              <>
                <Tooltip>
                  <Icon
                    size="smi"
                    heroIconName="plus"
                    className={`grid place-items-center w-10 h-10 mobile:w-8 mobile:h-8 ring-inset ring-1 mobile:ring-1 ring-[rgba(171,196,255,.5)] rounded-xl mobile:rounded-lg text-[rgba(171,196,255,.5)] opacity-100 clickable clickable-filter-effect ${
                      p ? 'opacity-100 clickable clickable-filter-effect' : 'opacity-50 not-clickable'
                    }`}
                    onClick={() => {
                      useConcentrated.setState({
                        isAddDialogOpen: true,
                        currentAmmPool: info,
                        targetUserPositionAccount: p
                      })
                    }}
                  />
                  <Tooltip.Panel>Add Liquidity</Tooltip.Panel>
                </Tooltip>
                <Tooltip>
                  <Icon
                    size="smi"
                    iconSrc="/icons/pools-remove-liquidity-entry.svg"
                    className={`grid place-items-center w-10 h-10 mobile:w-8 mobile:h-8 ring-inset ring-1 mobile:ring-1 ring-[rgba(171,196,255,.5)] rounded-xl mobile:rounded-lg text-[rgba(171,196,255,.5)] ${
                      p ? 'opacity-100 clickable clickable-filter-effect' : 'opacity-50 not-clickable'
                    }`}
                    onClick={() => {
                      useConcentrated.setState({
                        isRemoveDialogOpen: true,
                        currentAmmPool: info,
                        targetUserPositionAccount: p
                      })
                    }}
                  />
                  <Tooltip.Panel>Remove Liquidity</Tooltip.Panel>
                </Tooltip>
              </>
            )}
          </Row>
        </div>
      </Row>
    </AutoBox>
  )
}

function PositionAprIllustrator({
  poolInfo,
  positionInfo
}: {
  poolInfo: HydratedConcentratedInfo
  positionInfo: UserPositionAccount
}) {
  const timeBasis = useConcentrated((s) => s.timeBasis)
  const tokenPrices = useToken((s) => s.tokenPrices)
  const token = useToken((s) => s.tokens)
  const tokenDecimals = objectMap(token, (i) => i.decimals)
  const chainTimeOffset = useConnection((s) => s.chainTimeOffset)
  const aprCalcMethod = useConcentrated((s) => s.aprCalcMode)
  const positionApr = useMemo(
    () =>
      positionInfo?.getApr({
        tokenPrices,
        tokenDecimals,
        timeBasis: timeBasis.toLowerCase() as '24h' | '7d' | '30d',
        planType: aprCalcMethod,
        chainTimeOffsetMs: chainTimeOffset
      }),
    [chainTimeOffset, timeBasis, aprCalcMethod]
  )
  return (
    <Row className="items-center gap-2">
      <div className="text-[#abc4ff80] text-sm font-medium mobile:text-xs">APR</div>
      <ConcentratedModifyTooltipIcon iconClassName="opacity-50" />
      <div className="text-white text-sm font-medium mobile:text-xs">{toPercentString(positionApr?.apr)}</div>
      {isMeaningfulNumber(positionApr.apr) && (
        <Tooltip panelClassName="p-0 rounded-xl">
          <Row className="items-center gap-2 mobile:gap-1 mt-1">
            {positionApr && (
              <AprLine className="w-28" aprValues={[positionApr.fee.apr, ...positionApr.rewards.map((i) => i.apr)]} />
            )}
          </Row>
          <Tooltip.Panel>
            <div className="p-5">
              {positionApr && <AprChart type="positionAccount" colCount={2} positionAccount={positionInfo} />}
            </div>
          </Tooltip.Panel>
        </Tooltip>
      )}
    </Row>
  )
}

function TokenPositionInfo({
  token,
  tokenAmount,
  tokenPrice,
  suffix = '',
  customIcon,
  customKey,
  customValue,
  className
}: {
  token?: SplToken
  tokenAmount?: string
  tokenPrice?: CurrencyAmount
  suffix?: string
  customIcon?: any
  customKey?: any
  customValue?: any
  className?: string
}) {
  return (
    <Row className={twMerge('py-2 gap-8 justify-between items-center font-medium text-[12px] ', className)}>
      <Row className="flex items-center justify-start gap-[6px]">
        {customIcon ? customIcon : <CoinAvatar token={token} size="smi" />}
        <div className=" text-[#ABC4FF]">
          {customKey ? customKey : token ? token!.symbol : null} {suffix}
        </div>
      </Row>
      <Row className="flex justify-end gap-1">
        {customValue ? (
          customValue
        ) : (
          <>
            <div className="text-white">{tokenAmount}</div>
            <div className="text-[#ABC4FF]">({toUsdVolume(tokenPrice)})</div>
          </>
        )}
      </Row>
    </Row>
  )
}

function CoinAvatarInfoItem({ info, className }: { info: HydratedConcentratedInfo | undefined; className?: string }) {
  const isMobile = useAppSettings((s) => s.isMobile)
  const lowLiquidityAlertText = `This pool has relatively low liquidity. Always check the quoted price and that the pool has sufficient liquidity before trading.`
  const timeBasis = useConcentrated((s) => s.timeBasis)

  return (
    <AutoBox
      is={isMobile ? 'Col' : 'Row'}
      className={twMerge('clickable flex-wrap items-center mobile:items-start', className)}
    >
      <CoinAvatarPair
        className="justify-self-center mr-2"
        size={isMobile ? 'sm' : 'md'}
        token1={info?.base}
        token2={info?.quote}
      />
      <Row className="mobile:text-xs font-medium mobile:mt-px items-center flex-wrap gap-2">
        <Col>
          <div>{info?.name}</div>
          <div className="font-medium text-xs text-[#ABC4FF]/50">Fee {toPercentString(info?.tradeFeeRate)}</div>
        </Col>
        {/* Temprary don't */}
        {/* {lt(toString(info?.tvl, { decimalLength: 'auto 0' }) ?? 0, 100000) && (
          <Tooltip placement="right">
            <Icon size="sm" heroIconName="question-mark-circle" className="cursor-help" />
            <Tooltip.Panel>
              <div className="whitespace-pre">{lowLiquidityAlertText}</div>
            </Tooltip.Panel>
          </Tooltip>
        )} */}
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
