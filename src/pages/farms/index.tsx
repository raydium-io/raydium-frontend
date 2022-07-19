import { TokenAmount } from '@raydium-io/raydium-sdk'
import { Fragment, ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import { twMerge } from 'tailwind-merge'

import useAppSettings from '@/application/appSettings/useAppSettings'
import useCreateFarms from '@/application/createFarm/useCreateFarm'
import { isHydratedFarmInfo, isJsonFarmInfo } from '@/application/farms/judgeFarmInfo'
import txFarmDeposit from '@/application/farms/txFarmDeposit'
import txFarmHarvest from '@/application/farms/txFarmHarvest'
import txFarmWithdraw from '@/application/farms/txFarmWithdraw'
import { FarmPoolJsonInfo, HydratedFarmInfo, HydratedRewardInfo } from '@/application/farms/type'
import useFarmResetSelfCreatedByOwner from '@/application/farms/useFarmResetSelfCreatedByOwner'
import useFarms, { useFarmFavoriteIds } from '@/application/farms/useFarms'
import { useFarmUrlParser } from '@/application/farms/useFarmUrlParser'
import useNotification from '@/application/notification/useNotification'
import { usePools } from '@/application/pools/usePools'
import { routeTo } from '@/application/routeTools'
import useToken from '@/application/token/useToken'
import { RAYMint } from '@/application/token/wellknownToken.config'
import useWallet from '@/application/wallet/useWallet'
import AutoBox from '@/components/AutoBox'
import { Badge } from '@/components/Badge'
import Button, { ButtonHandle } from '@/components/Button'
import Card from '@/components/Card'
import CoinAvatar from '@/components/CoinAvatar'
import CoinAvatarPair from '@/components/CoinAvatarPair'
import CoinInputBox, { CoinInputBoxHandle } from '@/components/CoinInputBox'
import Col from '@/components/Col'
import Collapse from '@/components/Collapse'
import CyberpunkStyleCard from '@/components/CyberpunkStyleCard'
import Grid from '@/components/Grid'
import Icon from '@/components/Icon'
import Input from '@/components/Input'
import Link from '@/components/Link'
import List from '@/components/List'
import LoadingCircle from '@/components/LoadingCircle'
import PageLayout from '@/components/PageLayout'
import Popover from '@/components/Popover'
import RefreshCircle from '@/components/RefreshCircle'
import ResponsiveDialogDrawer from '@/components/ResponsiveDialogDrawer'
import Row from '@/components/Row'
import RowTabs from '@/components/RowTabs'
import Select from '@/components/Select'
import Switcher from '@/components/Switcher'
import Tabs from '@/components/Tabs'
import Tooltip, { TooltipHandle } from '@/components/Tooltip'
import { addItem, removeItem, shakeFalsyItem } from '@/functions/arrayMethods'
import { toUTC } from '@/functions/date/dateFormat'
import copyToClipboard from '@/functions/dom/copyToClipboard'
import formatNumber from '@/functions/format/formatNumber'
import toPubString from '@/functions/format/toMintString'
import toPercentString from '@/functions/format/toPercentString'
import { toTokenAmount } from '@/functions/format/toTokenAmount'
import toTotalPrice from '@/functions/format/toTotalPrice'
import toUsdVolume from '@/functions/format/toUsdVolume'
import { isMintEqual } from '@/functions/judgers/areEqual'
import { isTokenAmount } from '@/functions/judgers/dateType'
import { gt, gte, isMeaningfulNumber } from '@/functions/numberish/compare'
import { toString } from '@/functions/numberish/toString'
import { searchItems } from '@/functions/searchItems'
import { toggleSetItem } from '@/functions/setMethods'
import useSort from '@/hooks/useSort'

export default function FarmsPage() {
  useFarmUrlParser()
  useFarmResetSelfCreatedByOwner()
  return (
    <PageLayout mobileBarTitle="Farms" contentButtonPaddingShorter metaTitle="Farms - Raydium">
      <FarmHeader />
      <FarmCard />
    </PageLayout>
  )
}

function FarmHeader() {
  const isMobile = useAppSettings((s) => s.isMobile)
  return isMobile ? (
    <Row className="flex-wrap items-center justify-center  px-2 py-1 mb-2">
      {/* <div className="text-lg font-semibold justify-self-start text-white -mb-1">Farms</div> */}
      {/* <div className="font-medium text-[rgba(196,214,255,.5)] text-2xs">
          Stake your LP tokens and earn token rewards
        </div> */}
      <FarmTabBlock />
      {/* <FarmCreateFarmEntryBlock className="mr-4" /> */}
      {/* <FarmStakedOnlyBlock /> */}
    </Row>
  ) : (
    <Col>
      <Grid className="grid-cols-3 justify-between items-center pb-8 pt-0">
        <div className="text-2xl font-semibold justify-self-start text-white">Farms</div>
        <FarmTabBlock />
        <FarmCreateFarmEntryBlock />
      </Grid>
    </Col>
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
                <FarmStakedOnlyBlock />
                <FarmRefreshCircleBlock />
                <FarmTimeBasisSelectorBox />
              </Grid>
            </Card>
          </div>
        </Popover.Panel>
      </Popover>
    </>
  )
}

function FarmSearchBlock({ className }: { className?: string }) {
  const isMobile = useAppSettings((s) => s.isMobile)
  const storeSearchText = useFarms((s) => s.searchText)

  const tooltipComponentRef = useRef<TooltipHandle>(null)
  const [haveInitSearchText, setHaveInitSearchText] = useState(false)
  const haveInited = useRef(false)
  useEffect(() => {
    if (haveInited.current) return
    setTimeout(() => {
      // poopup immediately is strange
      haveInited.current = true
      if (storeSearchText) {
        setHaveInitSearchText(true)
        tooltipComponentRef.current?.open()
      }
    }, 600)
  }, [storeSearchText])
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
        <Tooltip disable={!haveInitSearchText} componentRef={tooltipComponentRef}>
          {/* TODO: Tooltip should accept 5 minutes */}
          <Icon
            heroIconName="x"
            size={isMobile ? 'xs' : 'sm'}
            className={`text-[rgba(196,214,255,0.5)] transition clickable ${
              storeSearchText ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
            onClick={() => {
              useFarms.setState({ searchText: '' })
            }}
          />
          <Tooltip.Panel>Click here to view all farm pools</Tooltip.Panel>
        </Tooltip>
      }
      placeholder="Search All"
      onUserInput={(searchText) => {
        useFarms.setState({ searchText })
      }}
    />
  )
}

function FarmStakedOnlyBlock({ className }: { className?: string }) {
  const onlySelfFarms = useFarms((s) => s.onlySelfFarms)
  const connected = useWallet((s) => s.connected)
  if (!connected) return null
  return (
    <Row className="justify-self-end  mobile:justify-self-auto items-center">
      <span className="text-[rgba(196,214,255,0.5)] whitespace-nowrap font-medium text-sm mobile:text-xs">
        Show Staked
      </span>
      <Switcher
        className="ml-2 "
        defaultChecked={onlySelfFarms}
        onToggle={(isOnly) => useFarms.setState({ onlySelfFarms: isOnly })}
      />
    </Row>
  )
}

function FarmSlefCreatedOnlyBlock({ className }: { className?: string }) {
  const onlySelfCreatedFarms = useFarms((s) => s.onlySelfCreatedFarms)
  return (
    <Row className="justify-self-end  mobile:justify-self-auto items-center">
      <span className="text-[rgba(196,214,255,0.5)] whitespace-nowrap font-medium text-sm mobile:text-xs">
        Show Created
      </span>
      <Switcher
        className="ml-2 "
        defaultChecked={onlySelfCreatedFarms}
        onToggle={(isOnly) => useFarms.setState({ onlySelfCreatedFarms: isOnly })}
      />
    </Row>
  )
}

function FarmCreateFarmEntryBlock({ className }: { className?: string }) {
  const owner = useWallet((s) => s.owner)
  const balances = useWallet((s) => s.balances)
  const userRayBalance = balances[toPubString(RAYMint)]
  const haveOver300Ray = gte(userRayBalance ?? 0, 300)
  return (
    <Row
      className={twMerge(
        `justify-self-end mobile:justify-self-auto gap-1 flex-wrap items-center opacity-100 pointer-events-auto clickable transition`,
        className
      )}
      onClick={() => {
        routeTo('/farms/create')
      }}
    >
      <Icon heroIconName="plus-circle" className="text-[#abc4ff]" size="sm" />
      <span className="text-[#abc4ff] font-medium text-sm mobile:text-xs">Create Farm</span>
    </Row>
  )
}

function FarmTabBlock({ className }: { className?: string }) {
  const currentTab = useFarms((s) => s.currentTab)
  const isMobile = useAppSettings((s) => s.isMobile)
  return isMobile ? (
    <Tabs
      showOffset={2}
      currentValue={currentTab}
      urlSearchQueryKey="tab"
      values={shakeFalsyItem(['Raydium', 'Fusion', 'Ecosystem', 'Staked'] as const)}
      onChange={(tab) => useFarms.setState({ currentTab: tab })}
      className={className}
    />
  ) : (
    <RowTabs
      currentValue={currentTab}
      urlSearchQueryKey="tab"
      values={shakeFalsyItem(['Raydium', 'Fusion', 'Ecosystem', 'Staked'] as const)}
      onChange={(tab) => useFarms.setState({ currentTab: tab })}
      className={twMerge('justify-self-center mobile:col-span-full', className)}
    />
  )
}

function FarmTimeBasisSelectorBox({ className }: { className?: string }) {
  const timeBasis = useFarms((s) => s.timeBasis)
  return (
    <Select
      className={twMerge('z-20', className)}
      candidateValues={['24H', '7D', '30D']}
      localStorageKey="ui-time-basis"
      defaultValue={timeBasis}
      prefix="Time Basis:"
      onChange={(newSortKey) => {
        useFarms.setState({ timeBasis: newSortKey ?? '7D' })
      }}
    />
  )
}

function FarmTableSorterBlock({
  className,
  onChange
}: {
  className?: string
  onChange?: (newKey: 'name' | `totalApr${'7d' | '30d' | '24h'}` | 'tvl' | 'favorite' | undefined) => void
}) {
  const timeBasis = useFarms((s) => s.timeBasis)
  return (
    <Select
      className={className}
      candidateValues={[
        { label: 'Farm', value: 'name' },
        {
          label: `APRS ${timeBasis}`,
          value: timeBasis === '24H' ? 'totalApr24h' : timeBasis === '7D' ? 'totalApr7d' : 'totalApr30d'
        },
        { label: 'TVL', value: 'tvl' },
        { label: 'Favorite', value: 'favorite' }
      ]}
      prefix="Sort by:"
      onChange={onChange}
    />
  )
}

function FarmRefreshCircleBlock({ className }: { className?: string }) {
  const refreshFarmInfos = useFarms((s) => s.refreshFarmInfos)
  const isMobile = useAppSettings((s) => s.isMobile)
  return isMobile ? (
    <Row className={twMerge('items-center', className)}>
      <span className="text-[rgba(196,214,255,0.5)] font-medium text-sm mobile:text-xs">Refresh farms</span>
      <RefreshCircle
        refreshKey="farms"
        className="justify-self-end"
        freshFunction={() => {
          refreshFarmInfos()
        }}
      />
    </Row>
  ) : (
    <div className={twMerge('justify-self-end', className)}>
      <RefreshCircle
        refreshKey="farms"
        className="justify-self-end"
        freshFunction={() => {
          refreshFarmInfos()
        }}
      />
    </div>
  )
}

function FarmCard() {
  const jsonInfos = useFarms((s) => s.jsonInfos)
  const hydratedInfos = useFarms((s) => s.hydratedInfos)
  const currentTab = useFarms((s) => s.currentTab)
  const onlySelfFarms = useFarms((s) => s.onlySelfFarms)
  const onlySelfCreatedFarms = useFarms((s) => s.onlySelfCreatedFarms)
  const searchText = useFarms((s) => s.searchText)
  const [favouriteIds] = useFarmFavoriteIds()
  const isMobile = useAppSettings((s) => s.isMobile)
  const owner = useWallet((s) => s.owner)
  const isLoading = useFarms((s) => s.isLoading)
  const timeBasis = useFarms((s) => s.timeBasis)
  const dataSource = hydratedInfos.length ? hydratedInfos : jsonInfos

  const tabedDataSource = useMemo(
    () =>
      (dataSource as (FarmPoolJsonInfo | HydratedFarmInfo)[]).filter((i) =>
        currentTab === 'Fusion'
          ? i.category === 'fusion' && (isHydratedFarmInfo(i) ? !i.isClosedPool : true)
          : currentTab === 'Staked'
          ? isHydratedFarmInfo(i)
            ? isMeaningfulNumber(i.ledger?.deposited)
            : false
          : currentTab === 'Ecosystem'
          ? i.category === 'ecosystem'
          : i.category === 'raydium' && (isHydratedFarmInfo(i) ? !i.isClosedPool : true)
      ),
    [currentTab, dataSource]
  )
  const haveSelfCreatedFarm = tabedDataSource.some((i) => isMintEqual(i.creator, owner))

  const applyFiltersDataSource = useMemo(
    () =>
      tabedDataSource
        .filter((i) =>
          onlySelfFarms && isHydratedFarmInfo(i) ? i.ledger && isMeaningfulNumber(i.ledger.deposited) : true
        ) // Switch
        .filter((i) => (i.version === 6 && onlySelfCreatedFarms && owner ? isMintEqual(i.creator, owner) : true)), // Switch
    [onlySelfFarms, searchText, onlySelfCreatedFarms, tabedDataSource, owner]
  )

  const applySearchedDataSource = useMemo(
    () =>
      searchItems(applyFiltersDataSource, {
        text: searchText,
        matchConfigs: (i) =>
          isHydratedFarmInfo(i)
            ? [
                { text: toPubString(i.id), entirely: true },
                { text: i.ammId, entirely: true },
                { text: toPubString(i.base?.mint), entirely: true },
                { text: toPubString(i.quote?.mint), entirely: true },
                i.base?.symbol,
                i.quote?.symbol
                // { text: toSentenceCase(i.base?.name ?? '').split(' '), entirely: true },
                // { text: toSentenceCase(i.quote?.name ?? '').split(' '), entirely: true }
              ]
            : [{ text: toPubString(i.id), entirely: true }]
      }),
    [applyFiltersDataSource, searchText]
  )

  const {
    sortedData,
    setConfig: setSortConfig,
    sortConfig,
    clearSortConfig
  } = useSort(applySearchedDataSource, {
    defaultSort: {
      key: 'defaultKey',
      sortCompare: [
        /* (i) => i.isUpcomingPool, */ /* (i) => i.isNewPool, */ (i) => favouriteIds?.includes(toPubString(i.id))
      ]
    }
  })

  const farmCardTitleInfo =
    currentTab === 'Ecosystem'
      ? {
          title: 'Ecosystem Farms',
          description: 'Stake and earn Solana Ecosystem token rewards',
          tooltip:
            'Ecosystem Farms allow any project or user to create a farm in a decentralized manner to incentivize liquidity providers. Rewards are locked for the duration on the farm. However, creator liquidity is not locked.'
        }
      : currentTab === 'Fusion'
      ? { title: 'Fusion Farms', description: 'Stake LP tokens and earn project token rewards' }
      : currentTab === 'Staked'
      ? { title: 'Your Staked Farms', description: 'You are currently staked in these farms' }
      : { title: 'Raydium Farms', description: 'Stake LP tokens and earn token rewards' }

  // NOTE: filter widgets
  const innerFarmDatabaseWidgets = isMobile ? (
    <div>
      <Row className="mb-4">
        <FarmSearchBlock className="grow-2 mr-3" />
        <FarmTableSorterBlock
          className="grow"
          onChange={(newSortKey) => {
            newSortKey
              ? setSortConfig({
                  key: newSortKey,
                  sortCompare:
                    newSortKey === 'favorite' ? (i) => favouriteIds?.includes(toPubString(i.id)) : (i) => i[newSortKey]
                })
              : clearSortConfig()
          }}
        />
        <ToolsButton className="self-center" />
      </Row>
    </div>
  ) : (
    <Row className="justify-between gap-16 items-center mb-4">
      <div>
        <Row className="items-center">
          <div className="font-medium text-white text-lg">{farmCardTitleInfo.title}</div>
          {farmCardTitleInfo.tooltip && (
            <Tooltip>
              <Icon className="ml-1" size="sm" heroIconName="question-mark-circle" />
              <Tooltip.Panel className="max-w-[300px]">{farmCardTitleInfo.tooltip}</Tooltip.Panel>
            </Tooltip>
          )}
        </Row>
        <div className="font-medium text-[rgba(196,214,255,.5)] text-base ">{farmCardTitleInfo.description}</div>
      </div>
      <Row className="items-stretch gap-6">
        {haveSelfCreatedFarm && <FarmSlefCreatedOnlyBlock />}
        <FarmStakedOnlyBlock />
        <FarmTimeBasisSelectorBox />
        <FarmSearchBlock />
      </Row>
    </Row>
  )

  return (
    <CyberpunkStyleCard
      haveMinHeight
      wrapperClassName="flex-1 overflow-hidden flex flex-col"
      className="p-10 pt-6 pb-4 mobile:px-3 mobile:py-3 w-full flex flex-col h-full"
    >
      {innerFarmDatabaseWidgets}
      {!isMobile && (
        <Row
          type="grid-x"
          className="mb-3 h-12  sticky -top-6 backdrop-filter z-10 backdrop-blur-md bg-[rgba(20,16,65,0.2)] mr-scrollbar rounded-xl mobile:rounded-lg gap-2 grid-cols-[auto,1.5fr,1.2fr,1fr,1fr,auto]"
        >
          <Row
            className="group w-20 pl-10 font-medium text-[#ABC4FF] text-sm items-center cursor-pointer  clickable clickable-filter-effect no-clicable-transform-effect"
            onClick={() => {
              setSortConfig({
                key: 'favorite',
                sortModeQueue: ['decrease', 'none'],
                sortCompare: (i) => favouriteIds?.includes(toPubString(i.id))
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
          {/* table head column: Farm */}
          <Row
            className="font-medium text-[#ABC4FF] text-sm items-center cursor-pointer clickable clickable-filter-effect no-clicable-transform-effect"
            onClick={() => {
              setSortConfig({
                key: 'name',
                sortModeQueue: ['increase', 'decrease', 'none'],
                sortCompare: (i) => (isHydratedFarmInfo(i) ? i.name : undefined)
              })
            }}
          >
            <div className="mr-16"></div>
            Farm
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

          {/* table head column: Pending Reward */}
          <div className=" font-medium self-center text-[#ABC4FF] text-sm">Pending Reward</div>

          {/* table head column: Total APR */}
          <Row
            className=" font-medium items-center text-[#ABC4FF] text-sm cursor-pointer gap-1  clickable clickable-filter-effect no-clicable-transform-effect"
            onClick={() => {
              const key = timeBasis === '24H' ? 'totalApr24h' : timeBasis === '7D' ? 'totalApr7d' : 'totalApr30d'
              setSortConfig({ key, sortCompare: (i) => (isHydratedFarmInfo(i) ? i[key] : undefined) })
            }}
          >
            Total APR {timeBasis}
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
                sortConfig?.key.startsWith('totalApr') && sortConfig.mode !== 'none'
                  ? sortConfig?.mode === 'decrease'
                    ? '/icons/msic-sort-down.svg'
                    : '/icons/msic-sort-up.svg'
                  : '/icons/msic-sort.svg'
              }
            />
          </Row>

          {/* table head column: TVL */}
          <Row
            className=" font-medium text-[#ABC4FF] text-sm items-center cursor-pointer  clickable clickable-filter-effect no-clicable-transform-effect"
            onClick={() =>
              setSortConfig({ key: 'tvl', sortCompare: (i) => (isHydratedFarmInfo(i) ? i.tvl : undefined) })
            }
          >
            TVL
            <Icon
              className="ml-1"
              size="sm"
              iconSrc={
                sortConfig?.key === 'tvl' && sortConfig.mode !== 'none'
                  ? sortConfig?.mode === 'decrease'
                    ? '/icons/msic-sort-down.svg'
                    : '/icons/msic-sort-up.svg'
                  : '/icons/msic-sort.svg'
              }
            />
          </Row>
          <FarmRefreshCircleBlock className="pr-8 self-center" />
        </Row>
      )}

      <FarmCardDatabaseBody isLoading={isLoading} infos={sortedData} />
    </CyberpunkStyleCard>
  )
}

function FarmCardDatabaseBody({
  isLoading,
  infos
}: {
  isLoading: boolean
  infos: (FarmPoolJsonInfo | HydratedFarmInfo)[]
}) {
  const expandedItemIds = useFarms((s) => s.expandedItemIds)
  const [favouriteIds, setFavouriteIds] = useFarmFavoriteIds()
  return (
    <>
      {infos.length ? (
        <List className="gap-3 text-[#ABC4FF] flex-1 -mx-2 px-2" /* let scrollbar have some space */>
          {infos.map((info: FarmPoolJsonInfo | HydratedFarmInfo) => (
            <List.Item key={toPubString(info.id)}>
              <Collapse
                open={expandedItemIds.has(toPubString(info.id))}
                onToggle={() => {
                  useFarms.setState((s) => ({
                    expandedItemIds: toggleSetItem(s.expandedItemIds, toPubString(info.id))
                  }))
                }}
              >
                <Collapse.Face>
                  {(open) => (
                    <FarmCardDatabaseBodyCollapseItemFace
                      open={open}
                      info={info}
                      isFavourite={favouriteIds?.includes(toPubString(info.id))}
                      onUnFavorite={(farmId) => {
                        setFavouriteIds((ids) => removeItem(ids ?? [], farmId))
                      }}
                      onStartFavorite={(farmId) => {
                        setFavouriteIds((ids) => addItem(ids ?? [], farmId))
                      }}
                    />
                  )}
                </Collapse.Face>
                <Collapse.Body>
                  {isLoading ? null : <FarmCardDatabaseBodyCollapseItemContent farmInfo={info as HydratedFarmInfo} />}
                </Collapse.Body>
              </Collapse>
            </List.Item>
          ))}
        </List>
      ) : (
        <Row className="text-center justify-center text-2xl p-12 opacity-50 text-[rgb(171,196,255)]">
          {isLoading ? <LoadingCircle /> : '(No results found)'}
        </Row>
      )}
      <FarmStakeLpDialog />
    </>
  )
}

// currently only SDKRewardInfo
function FarmRewardBadge({
  farmInfo,
  reward
}: {
  farmInfo: HydratedFarmInfo
  reward: HydratedRewardInfo | TokenAmount | undefined
}) {
  if (!reward) return null
  const isRewarding = isTokenAmount(reward) ? true : reward.isRewarding
  const isRewardEnded = isTokenAmount(reward) ? false : reward.isRewardEnded
  const isRewardBeforeStart = isTokenAmount(reward) ? false : reward.isRewardBeforeStart
  const pendingAmount = isTokenAmount(reward) ? reward : reward.userPendingReward
  return (
    <Tooltip placement="bottom">
      <Row
        className={`ring-1 ring-inset ring-[#abc4ff80] p-1 rounded-full items-center gap-2 overflow-hidden ${
          isRewarding ? '' : 'opacity-50'
        } ${isRewardBeforeStart ? '' : ''}`}
      >
        {gt(pendingAmount, 0.001) && (
          <div className="text-xs translate-y-0.125 pl-1">
            {formatNumber(toString(pendingAmount), {
              fractionLength: 3
            })}
          </div>
        )}
        <div className="relative">
          <CoinAvatar size="smi" token={reward.token} className={isRewardBeforeStart ? 'blur-sm' : ''} />
          {isRewardEnded && (
            <div className="absolute h-[1.5px] w-full top-1/2 -translate-y-1/2 rotate-45 bg-[#abc4ff80] scale-x-125"></div>
          )}
          {isRewardBeforeStart && (
            <div className="absolute top-1/2 -translate-y-1/2 opacity-70">
              <Icon heroIconName="dots-horizontal" />
            </div>
          )}
        </div>
      </Row>
      <Tooltip.Panel>
        <div className="mb-1">
          {reward.token?.symbol ?? '--'}{' '}
          {!isTokenAmount(reward) &&
            reward.openTime &&
            reward.endTime &&
            (isRewardEnded ? 'Reward Ended' : isRewardBeforeStart ? 'Reward Not Started' : 'Reward Period')}
        </div>
        {!isTokenAmount(reward) && reward.openTime && reward.endTime && (
          <div className="opacity-50">
            {toUTC(reward.openTime, { hideTimeDetail: true })} ~ {toUTC(reward.endTime, { hideTimeDetail: true })}
          </div>
        )}
        <FarmCardTooltipPanelAddressItem
          className="opacity-50 mt-2 contrast-75"
          type="token"
          address={reward.token?.mint.toString() ?? '--'}
        />
      </Tooltip.Panel>
    </Tooltip>
  )
}

function FarmCardDatabaseBodyCollapseItemFace({
  open,
  className,
  info,
  isFavourite,
  onUnFavorite,
  onStartFavorite
}: {
  open: boolean
  className?: string
  info: HydratedFarmInfo | FarmPoolJsonInfo
  isFavourite?: boolean
  onUnFavorite?: (farmId: string) => void
  onStartFavorite?: (farmId: string) => void
}) {
  const isMobile = useAppSettings((s) => s.isMobile)
  const timeBasis = useFarms((s) => s.timeBasis)

  const pcCotent = (
    <Row
      type="grid-x"
      className={twMerge(
        `py-5 mobile:py-4 mobile:px-5 ${
          info.local ? 'border-2 border-[#DA2EEF]' : ''
        } bg-[#141041] items-stretch gap-2 grid-cols-[auto,1.5fr,1.2fr,1fr,1fr,auto] mobile:grid-cols-[1fr,1fr,1fr,auto] rounded-t-3xl mobile:rounded-t-lg ${
          open ? '' : 'rounded-b-3xl mobile:rounded-b-lg'
        } transition-all`,
        className
      )}
    >
      <div className="w-12 self-center ml-6 mr-2">
        {isFavourite ? (
          <Icon
            iconSrc="/icons/misc-star-filled.svg"
            onClick={({ ev }) => {
              ev.stopPropagation()
              onUnFavorite?.(toPubString(info.id))
            }}
            className="clickable clickable-mask-offset-2 m-auto self-center"
          />
        ) : (
          <Icon
            iconSrc="/icons/misc-star-empty.svg"
            onClick={({ ev }) => {
              ev.stopPropagation()
              onStartFavorite?.(toPubString(info.id))
            }}
            className="clickable clickable-mask-offset-2 opacity-30 hover:opacity-80 transition m-auto self-center"
          />
        )}
      </div>

      <CoinAvatarInfoItem info={info} className="self-center" />

      {info.version === 6 ? (
        <TextInfoItem
          name="Pending Rewards"
          value={
            <Row className="flex-wrap gap-2 w-full pr-8">
              {isJsonFarmInfo(info)
                ? '--'
                : info.rewards
                    .filter((i) => i.perSecond != 0)
                    .map((reward) => {
                      return (
                        <Fragment key={toPubString(reward.rewardVault)}>
                          <FarmRewardBadge farmInfo={info} reward={reward} />
                        </Fragment>
                      )
                    })}
            </Row>
          }
        />
      ) : (
        <TextInfoItem
          name="Pending Rewards"
          value={
            <Row className="flex-wrap gap-2 w-full pr-8">
              {isJsonFarmInfo(info)
                ? '--'
                : info.rewards.map(
                    ({ token, userPendingReward, userHavedReward }) =>
                      userHavedReward &&
                      token && (
                        <div key={toPubString(token?.mint)}>
                          <FarmRewardBadge farmInfo={info} reward={userPendingReward ?? toTokenAmount(token, 0)} />
                        </div>
                      )
                  )}
            </Row>
          }
        />
      )}

      <TextInfoItem
        name={`Total APR ${timeBasis}`}
        className="w-max"
        value={
          isJsonFarmInfo(info) ? (
            '--'
          ) : timeBasis === '24H' ? (
            <Tooltip placement="right">
              {info.totalApr24h ? toPercentString(info.totalApr24h) : '--'}
              <Tooltip.Panel>
                {info.raydiumFeeApr24h && (
                  <div className="whitespace-nowrap">Fees {toPercentString(info.raydiumFeeApr24h)}</div>
                )}
                {info.rewards.map(
                  ({ apr, token, userHavedReward }, idx) =>
                    userHavedReward && (
                      <div key={idx} className="whitespace-nowrap">
                        {token?.symbol} {toPercentString(apr)}
                      </div>
                    )
                )}
              </Tooltip.Panel>
            </Tooltip>
          ) : timeBasis == '30D' ? (
            <Tooltip placement="right">
              {info.totalApr30d ? toPercentString(info.totalApr30d) : '--'}
              <Tooltip.Panel>
                {info.raydiumFeeApr30d && (
                  <div className="whitespace-nowrap">Fees {toPercentString(info.raydiumFeeApr30d)}</div>
                )}
                {info.rewards.map(
                  ({ apr, token, userHavedReward }, idx) =>
                    userHavedReward && (
                      <div key={idx} className="whitespace-nowrap">
                        {token?.symbol} {toPercentString(apr)}
                      </div>
                    )
                )}
              </Tooltip.Panel>
            </Tooltip>
          ) : (
            <Tooltip placement="right">
              {info.totalApr7d ? toPercentString(info.totalApr7d) : '--'}
              <Tooltip.Panel>
                {info.raydiumFeeApr7d && (
                  <div className="whitespace-nowrap">Fees {toPercentString(info.raydiumFeeApr7d)}</div>
                )}
                {info.rewards.map(
                  ({ apr, token, userHavedReward }, idx) =>
                    userHavedReward && (
                      <div key={idx} className="whitespace-nowrap">
                        {token?.symbol} {toPercentString(apr)}
                      </div>
                    )
                )}
              </Tooltip.Panel>
            </Tooltip>
          )
        }
      />
      <TextInfoItem
        name="TVL"
        value={isJsonFarmInfo(info) ? '--' : info.tvl ? `~${toUsdVolume(info.tvl, { decimalPlace: 0 })}` : '--'}
        subValue={
          isJsonFarmInfo(info)
            ? '--'
            : info.stakedLpAmount && `${formatNumber(toString(info.stakedLpAmount, { decimalLength: 0 }))} LP`
        }
      />

      <Grid className="w-9 h-9 mr-8 place-items-center self-center">
        <Icon size="sm" className="justify-self-end mr-1.5" heroIconName={`${open ? 'chevron-up' : 'chevron-down'}`} />
      </Grid>
    </Row>
  )

  const mobileContent = (
    <Collapse open={open}>
      <Collapse.Face>
        <Row
          type="grid-x"
          className={`py-4 px-5 mobile:p-2 items-stretch gap-2 grid-cols-[auto,1.1fr,1fr,1fr,auto] bg-[#141041] mobile:rounded-t-lg ${
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
                  onUnFavorite?.(toPubString(info.id))
                }}
                size="sm"
              />
            ) : (
              <Icon
                className="clickable opacity-30 hover:opacity-80 transition clickable-mask-offset-2 m-auto self-center"
                iconSrc="/icons/misc-star-empty.svg"
                onClick={({ ev }) => {
                  ev.stopPropagation()
                  onStartFavorite?.(toPubString(info.id))
                }}
                size="sm"
              />
            )}
          </div>
          <CoinAvatarInfoItem info={info} className="self-center" />

          <TextInfoItem
            name="TVL"
            value={
              isJsonFarmInfo(info)
                ? '--'
                : info.tvl
                ? `≈${toUsdVolume(info.tvl, { autoSuffix: true, decimalPlace: 0 })}`
                : '--'
            }
            subValue={
              isJsonFarmInfo(info)
                ? '--'
                : info.stakedLpAmount && `${formatNumber(toString(info.stakedLpAmount, { decimalLength: 0 }))} LP`
            }
          />

          <TextInfoItem
            name={`Total APR(${timeBasis})`}
            value={
              isJsonFarmInfo(info) ? (
                '--'
              ) : (
                <Tooltip placement="right">
                  {info.totalApr7d ? toPercentString(info.totalApr7d) : '--'}
                  <Tooltip.Panel>
                    {info.raydiumFeeApr7d && (
                      <div className="whitespace-nowrap">Fees {toPercentString(info.raydiumFeeApr7d)}</div>
                    )}
                    {info.rewards.map(
                      ({ apr, token, userHavedReward }, idx) =>
                        userHavedReward && (
                          <div key={idx} className="whitespace-nowrap">
                            {token?.symbol} {toPercentString(apr)}
                          </div>
                        )
                    )}
                  </Tooltip.Panel>
                </Tooltip>
              )
            }
          />

          <Grid className="w-6 h-6 place-items-center self-center">
            <Icon size="sm" heroIconName={`${open ? 'chevron-up' : 'chevron-down'}`} />
          </Grid>
        </Row>
      </Collapse.Face>

      <Collapse.Body>
        {/* <Row type="grid-x" className="py-4 px-5 relative items-center gap-2 grid-cols-[1fr,1fr,1fr,auto]  bg-[#141041]">
          <div className="absolute top-0 left-5 right-5 border-[rgba(171,196,255,.2)] border-t-1.5"></div>
          <TextInfoItem
            name="Volume(7d)"
            value={isHydratedPoolItemInfo(info) ? toUsdVolume(info.volume7d, { autoSuffix: true }) : undefined}
          />
          <TextInfoItem
            name="Volume(24h)"
            value={isHydratedPoolItemInfo(info) ? toUsdVolume(info.volume24h, { autoSuffix: true }) : undefined}
          />
          <TextInfoItem
            name="Fees(7d)"
            value={isHydratedPoolItemInfo(info) ? toUsdVolume(info.fee7d, { autoSuffix: true }) : undefined}
          />

          <Grid className="w-6 h-6 place-items-center"></Grid>
        </Row> */}
      </Collapse.Body>
    </Collapse>
  )

  return isMobile ? mobileContent : pcCotent
}

function FarmCardDatabaseBodyCollapseItemContent({ farmInfo }: { farmInfo: HydratedFarmInfo }) {
  const lpPrices = usePools((s) => s.lpPrices)
  const prices = useToken((s) => s.tokenPrices)
  const isMobile = useAppSettings((s) => s.isMobile)
  const lightBoardClass = 'bg-[rgba(20,16,65,.2)]'
  const connected = useWallet((s) => s.connected)
  const owner = useWallet((s) => s.owner)
  const balances = useWallet((s) => s.balances)
  const hasLp = isMeaningfulNumber(balances[toPubString(farmInfo.lpMint)])
  const hasPendingReward = farmInfo.rewards.some(({ userPendingReward }) => isMeaningfulNumber(userPendingReward))
  const logSuccess = useNotification((s) => s.logSuccess)
  return (
    <div
      className="rounded-b-3xl mobile:rounded-b-lg overflow-hidden"
      style={{
        background: 'linear-gradient(126.6deg, rgba(171, 196, 255, 0.12), rgb(171 196 255 / 4%) 100%)'
      }}
    >
      <AutoBox is={isMobile ? 'Col' : 'Row'} className={`mobile:gap-3`}>
        <AutoBox
          is={isMobile ? 'Col' : 'Grid'}
          className="grid-cols-[1fr,1.5fr] gap-8 mobile:gap-3 flex-grow px-8 py-5 mobile:px-4 mobile:py-3"
        >
          <Row className="p-6 mobile:py-3 mobile:px-4 flex-grow ring-inset ring-1 mobile:ring-1 ring-[rgba(171,196,255,.5)] rounded-3xl mobile:rounded-xl items-center gap-3">
            <div className="flex-grow">
              <div className="text-[rgba(171,196,255,0.5)] font-medium text-sm mobile:text-2xs mb-1">Deposited</div>
              <div className="text-white font-medium text-base mobile:text-xs">
                {lpPrices[String(farmInfo.lpMint)] && farmInfo.userStakedLpAmount
                  ? toUsdVolume(toTotalPrice(farmInfo.userStakedLpAmount, lpPrices[String(farmInfo.lpMint)]))
                  : '--'}
              </div>
              {farmInfo.userStakedLpAmount && (
                <div className="text-[rgba(171,196,255,0.5)] font-medium text-sm mobile:text-xs">
                  {formatNumber(toString(farmInfo.userStakedLpAmount), {
                    fractionLength: farmInfo.userStakedLpAmount?.token.decimals
                  })}{' '}
                  LP
                </div>
              )}
            </div>
            <Row className="gap-3">
              {farmInfo.userHasStaked ? (
                <>
                  <Button
                    className="frosted-glass-teal mobile:px-6 mobile:py-2 mobile:text-xs"
                    disabled={(farmInfo.isClosedPool && !farmInfo.isUpcomingPool) || !hasLp}
                    validators={[
                      { should: !farmInfo.isClosedPool },
                      {
                        should: connected,
                        forceActive: true,
                        fallbackProps: {
                          children: 'Connect Wallet',
                          onClick: () => useAppSettings.setState({ isWalletSelectorShown: true })
                        }
                      },
                      {
                        should: hasLp,
                        forceActive: true,
                        fallbackProps: {
                          children: 'Add Liquidity',
                          onClick: () =>
                            routeTo('/liquidity/add', { queryProps: { coin1: farmInfo.base, coin2: farmInfo.quote } })
                        }
                      }
                    ]}
                    onClick={() => {
                      if (connected) {
                        useFarms.setState({
                          isStakeDialogOpen: true,
                          stakeDialogMode: 'deposit',
                          stakeDialogInfo: farmInfo
                        })
                      } else {
                        useAppSettings.setState({ isWalletSelectorShown: true })
                      }
                    }}
                  >
                    Stake
                  </Button>
                  <Tooltip>
                    <Icon
                      size={isMobile ? 'sm' : 'smi'}
                      heroIconName="minus"
                      className="grid place-items-center w-10 h-10 mobile:w-8 mobile:h-8 ring-inset ring-1 mobile:ring-1 ring-[rgba(171,196,255,.5)] rounded-xl mobile:rounded-lg text-[rgba(171,196,255,.5)] clickable clickable-filter-effect"
                      onClick={() => {
                        if (connected) {
                          useFarms.setState({
                            isStakeDialogOpen: true,
                            stakeDialogMode: 'withdraw',
                            stakeDialogInfo: farmInfo
                          })
                        } else {
                          useAppSettings.setState({ isWalletSelectorShown: true })
                        }
                      }}
                    />
                    <Tooltip.Panel>Unstake LP</Tooltip.Panel>
                  </Tooltip>
                </>
              ) : (
                <Button
                  className="frosted-glass-teal mobile:py-2 mobile:text-xs"
                  validators={[
                    { should: !farmInfo.isClosedPool },
                    {
                      should: connected,
                      forceActive: true,
                      fallbackProps: {
                        children: 'Connect Wallet',
                        onClick: () => useAppSettings.setState({ isWalletSelectorShown: true })
                      }
                    },
                    {
                      should: hasLp,
                      forceActive: true,
                      fallbackProps: {
                        children: 'Add Liquidity',
                        onClick: () =>
                          routeTo('/liquidity/add', { queryProps: { coin1: farmInfo.base, coin2: farmInfo.quote } })
                      }
                    }
                  ]}
                  onClick={() => {
                    useFarms.setState({
                      isStakeDialogOpen: true,
                      stakeDialogMode: 'deposit',
                      stakeDialogInfo: farmInfo
                    })
                  }}
                >
                  Start Farming
                </Button>
              )}
            </Row>
          </Row>

          <AutoBox
            is={isMobile ? 'Col' : 'Row'}
            className="p-6 mobile:py-3 mobile:px-4 flex-grow ring-inset ring-1 mobile:ring-1 ring-[rgba(171,196,255,.5)] rounded-3xl mobile:rounded-xl items-center gap-3"
          >
            {farmInfo.version === 6 ? (
              <div className="flex-grow w-full">
                <div
                  className={`text-[rgba(171,196,255,0.5)] font-medium text-sm mobile:text-2xs ${
                    farmInfo.rewards.length > 2 ? 'mb-5' : 'mb-1'
                  }`}
                >
                  Pending rewards
                </div>
                <Grid
                  className={`gap-board clip-insert-4 ${farmInfo.rewards.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}
                >
                  {farmInfo.rewards
                    ?.filter((i) => i.perSecond != 0)
                    .map((reward, idx) => (
                      <div key={idx} className="p-4">
                        <div className={`text-white font-medium text-base mobile:text-xs mb-0.5`}>
                          {reward.userPendingReward ? toString(reward.userPendingReward) : 0} {reward.token?.symbol}
                        </div>
                        <div className="text-[rgba(171,196,255,0.5)] font-medium text-sm mobile:text-2xs">
                          {prices?.[String(reward.token?.mint)] && isMeaningfulNumber(reward?.userPendingReward)
                            ? toUsdVolume(toTotalPrice(reward.userPendingReward, prices[String(reward.token?.mint)]))
                            : null}
                        </div>
                      </div>
                    ))}
                </Grid>
              </div>
            ) : (
              <Row className="flex-grow divide-x-1.5 w-full">
                {farmInfo.rewards?.map(
                  (reward, idx) =>
                    reward.userHavedReward && (
                      <div
                        key={idx}
                        className={`px-4 ${idx === 0 ? 'pl-0' : ''} ${
                          idx === farmInfo.rewards.length - 1 ? 'pr-0' : ''
                        } border-[rgba(171,196,255,.5)]`}
                      >
                        <div className="text-[rgba(171,196,255,0.5)] font-medium text-sm mobile:text-2xs mb-1">
                          Pending rewards
                        </div>
                        <div className={`text-white font-medium text-base mobile:text-xs mb-0.5`}>
                          {reward.userPendingReward ? toString(reward.userPendingReward) : 0} {reward.token?.symbol}
                        </div>
                        <div className="text-[rgba(171,196,255,0.5)] font-medium text-sm mobile:text-2xs">
                          {prices?.[String(reward.token?.mint)] && reward?.userPendingReward
                            ? toUsdVolume(toTotalPrice(reward.userPendingReward, prices[String(reward.token?.mint)]))
                            : null}
                        </div>
                      </div>
                    )
                )}
              </Row>
            )}
            <Button
              // disable={Number(info.pendingReward?.numerator) <= 0}
              className="frosted-glass-teal rounded-xl mobile:w-full mobile:py-2 mobile:text-xs whitespace-nowrap"
              onClick={() => {
                txFarmHarvest(farmInfo, {
                  isStaking: false,
                  rewardAmounts: farmInfo.rewards
                    .map(({ userPendingReward }) => userPendingReward)
                    .filter(isMeaningfulNumber) as TokenAmount[]
                })
              }}
              validators={[
                {
                  should: connected,
                  forceActive: true,
                  fallbackProps: {
                    onClick: () => useAppSettings.setState({ isWalletSelectorShown: true }),
                    children: 'Connect Wallet'
                  }
                },
                { should: hasPendingReward }
              ]}
            >
              Harvest
            </Button>
          </AutoBox>
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
                heroIconName="link"
                className="grid place-items-center w-10 h-10 mobile:w-8 mobile:h-8 ring-inset ring-1 mobile:ring-1 ring-[rgba(171,196,255,.5)] rounded-xl mobile:rounded-lg text-[rgba(171,196,255,.5)] clickable clickable-filter-effect"
                onClick={() => {
                  copyToClipboard(
                    new URL(
                      `farms/?tab=${useFarms.getState().currentTab}&farmid=${toPubString(farmInfo.id)}`,
                      window.location.origin
                    ).toString()
                  ).then(() => {
                    logSuccess('Copy Farm Link', <div>Farm ID: {toPubString(farmInfo.id)}</div>)
                  })
                }}
              />
              <Icon
                size="sm"
                heroIconName="plus"
                className="grid place-items-center w-10 h-10 mobile:w-8 mobile:h-8 ring-inset ring-1 mobile:ring-1 ring-[rgba(171,196,255,.5)] rounded-xl mobile:rounded-lg text-[rgba(171,196,255,.5)] clickable clickable-filter-effect"
                onClick={() => {
                  routeTo('/liquidity/add', { queryProps: { ammId: farmInfo.ammId } })
                }}
              />
              <Icon
                size="sm"
                iconSrc="/icons/msic-swap-h.svg"
                className="grid place-items-center w-10 h-10 mobile:w-8 mobile:h-8 ring-inset ring-1 mobile:ring-1 ring-[rgba(171,196,255,.5)] rounded-xl mobile:rounded-lg text-[rgba(171,196,255,.5)] clickable clickable-filter-effect"
                onClick={() => {
                  routeTo('/swap', { queryProps: { coin1: farmInfo.base, coin2: farmInfo.quote } })
                }}
              />
            </Row>
          ) : (
            <>
              <Tooltip>
                <Icon
                  size="smi"
                  heroIconName="link"
                  className="grid place-items-center w-10 h-10 mobile:w-8 mobile:h-8 ring-inset ring-1 mobile:ring-1 ring-[rgba(171,196,255,.5)] rounded-xl mobile:rounded-lg text-[rgba(171,196,255,.5)] clickable clickable-filter-effect"
                  onClick={() => {
                    copyToClipboard(
                      new URL(
                        `farms/?tab=${useFarms.getState().currentTab}&farmid=${toPubString(farmInfo.id)}`,
                        window.location.origin
                      ).toString()
                    ).then(() => {
                      logSuccess('Copy Farm Link', <div>Farm ID: {toPubString(farmInfo.id)}</div>)
                    })
                  }}
                />
                <Tooltip.Panel>Copy Farm Link</Tooltip.Panel>
              </Tooltip>
              <Tooltip>
                <Icon
                  size="smi"
                  heroIconName="plus"
                  className="grid place-items-center w-10 h-10 mobile:w-8 mobile:h-8 ring-inset ring-1 mobile:ring-1 ring-[rgba(171,196,255,.5)] rounded-xl mobile:rounded-lg text-[rgba(171,196,255,.5)] clickable clickable-filter-effect"
                  onClick={() => {
                    routeTo('/liquidity/add', { queryProps: { ammId: farmInfo.ammId } })
                  }}
                />
                <Tooltip.Panel>Add Liquidity</Tooltip.Panel>
              </Tooltip>
              <Tooltip>
                <Icon
                  size="smi"
                  iconSrc="/icons/msic-swap-h.svg"
                  className="grid place-items-center w-10 h-10 mobile:w-8 mobile:h-8 ring-inset ring-1 mobile:ring-1 ring-[rgba(171,196,255,.5)] rounded-xl mobile:rounded-lg text-[rgba(171,196,255,.5)] clickable clickable-filter-effect"
                  onClick={() => {
                    routeTo('/swap', { queryProps: { coin1: farmInfo.base, coin2: farmInfo.quote } })
                  }}
                />
                <Tooltip.Panel>Swap</Tooltip.Panel>
              </Tooltip>
            </>
          )}
        </Row>
      </AutoBox>

      {/* farm edit button  */}
      {isMintEqual(farmInfo.creator, owner) && (
        <Row className="bg-[#14104133] py-3 px-8 justify-end">
          <Button
            className="frosted-glass-teal"
            onClick={() => {
              useCreateFarms.setState({
                isRoutedByCreateOrEdit: true
              })
              routeTo('/farms/edit', { queryProps: { farmInfo: farmInfo } })
            }}
          >
            Edit Farm
          </Button>
        </Row>
      )}
    </div>
  )
}

function FarmStakeLpDialog() {
  const connected = useWallet((s) => s.connected)
  const balances = useWallet((s) => s.balances)
  const tokenAccounts = useWallet((s) => s.tokenAccounts)

  const stakeDialogFarmInfo = useFarms((s) => s.stakeDialogInfo)
  const isStakeDialogOpen = useFarms((s) => s.isStakeDialogOpen)
  const stakeDialogMode = useFarms((s) => s.stakeDialogMode)

  const [amount, setAmount] = useState<string>()
  const userHasLpAccount = useMemo(
    () =>
      Boolean(stakeDialogFarmInfo?.lpMint) &&
      tokenAccounts.some(({ mint }) => String(mint) === String(stakeDialogFarmInfo?.lpMint)),
    [tokenAccounts, stakeDialogFarmInfo]
  )
  const avaliableTokenAmount = useMemo(
    () =>
      stakeDialogMode === 'deposit'
        ? stakeDialogFarmInfo?.lpMint && balances[String(stakeDialogFarmInfo.lpMint)]
        : stakeDialogFarmInfo?.userStakedLpAmount,
    [stakeDialogFarmInfo, balances, stakeDialogMode]
  )
  const userInputTokenAmount = useMemo(() => {
    if (!stakeDialogFarmInfo?.lp || !amount) return undefined
    return toTokenAmount(stakeDialogFarmInfo.lp, amount, { alreadyDecimaled: true })
  }, [stakeDialogFarmInfo, amount])
  const isAvailableInput = useMemo(
    () =>
      Boolean(
        userInputTokenAmount &&
          gt(userInputTokenAmount, 0) &&
          avaliableTokenAmount &&
          gte(avaliableTokenAmount, userInputTokenAmount)
      ),
    [avaliableTokenAmount, userInputTokenAmount]
  )

  // for keyboard navigation
  const coinInputBoxComponentRef = useRef<CoinInputBoxHandle>()
  const buttonComponentRef = useRef<ButtonHandle>()

  return (
    <ResponsiveDialogDrawer
      open={isStakeDialogOpen}
      onClose={() => {
        setAmount(undefined)
        useFarms.setState({ isStakeDialogOpen: false, stakeDialogInfo: undefined })
      }}
      placement="from-bottom"
    >
      {({ close }) => (
        <Card
          className="backdrop-filter backdrop-blur-xl p-8 w-[min(468px,100vw)] mobile:w-full border-1.5 border-[rgba(171,196,255,0.2)] bg-cyberpunk-card-bg shadow-cyberpunk-card"
          size="lg"
        >
          {/* {String(info?.lpMint)} */}
          <Row className="justify-between items-center mb-6">
            <div className="text-xl font-semibold text-white">
              {stakeDialogMode === 'withdraw' ? 'Unstake LP' : 'Stake LP'}
            </div>
            <Icon className="text-[#ABC4FF] cursor-pointer" heroIconName="x" onClick={close} />
          </Row>
          {/* input-container-box */}
          <CoinInputBox
            className="mb-6"
            componentRef={coinInputBoxComponentRef}
            topLeftLabel="Farm"
            token={stakeDialogFarmInfo?.lp}
            onUserInput={setAmount}
            onEnter={(input) => {
              if (!input) return
              buttonComponentRef.current?.click?.()
            }}
            maxValue={stakeDialogMode === 'withdraw' ? stakeDialogFarmInfo?.userStakedLpAmount : undefined}
            topRightLabel={
              stakeDialogMode === 'withdraw'
                ? stakeDialogFarmInfo?.userStakedLpAmount
                  ? `Deposited: ${toString(stakeDialogFarmInfo?.userStakedLpAmount)}`
                  : '(no deposited)'
                : undefined
            }
          />
          <Row className="flex-col gap-1">
            <Button
              className="frosted-glass-teal"
              componentRef={buttonComponentRef}
              validators={[
                { should: connected },
                { should: stakeDialogFarmInfo?.lp },
                { should: isAvailableInput },
                { should: amount },
                {
                  should: stakeDialogMode == 'withdraw' ? true : userHasLpAccount,
                  fallbackProps: { children: 'No Stakable LP' }
                }
              ]}
              onClick={() => {
                if (!stakeDialogFarmInfo?.lp || !amount) return
                const tokenAmount = toTokenAmount(stakeDialogFarmInfo.lp, amount, { alreadyDecimaled: true })
                ;(stakeDialogMode === 'withdraw'
                  ? txFarmWithdraw(stakeDialogFarmInfo, { isStaking: false, amount: tokenAmount })
                  : txFarmDeposit(stakeDialogFarmInfo, { isStaking: false, amount: tokenAmount })
                ).then(() => {
                  close()
                })
              }}
            >
              {stakeDialogMode === 'withdraw' ? 'Unstake LP' : 'Stake LP'}
            </Button>
            <Button type="text" className="text-sm backdrop-filter-none" onClick={close}>
              Cancel
            </Button>
          </Row>
        </Card>
      )}
    </ResponsiveDialogDrawer>
  )
}

function CoinAvatarInfoItem({ info, className }: { info: HydratedFarmInfo | FarmPoolJsonInfo; className?: string }) {
  const isMobile = useAppSettings((s) => s.isMobile)
  const getLpToken = useToken((s) => s.getLpToken)
  const getToken = useToken((s) => s.getToken)
  const isStable = isJsonFarmInfo(info) ? false : info.isStablePool

  if (isJsonFarmInfo(info)) {
    const lpToken = getLpToken(info.lpMint) // TODO: may be token can cache?
    const name = lpToken ? `${lpToken.base.symbol ?? '--'} - ${lpToken.quote.symbol ?? '--'}` : '--' // TODO: rule of get farm name should be a issolate function
    return (
      <AutoBox
        is={isMobile ? 'Col' : 'Row'}
        className={twMerge('flex-wrap items-center mobile:items-start', className)}
      >
        <CoinAvatarPair
          className="justify-self-center mr-2"
          size={isMobile ? 'sm' : 'md'}
          token1={getToken(info.baseMint)}
          token2={getToken(info.quoteMint)}
        />
        <div>
          {getToken(info.baseMint) && (
            <div className="mobile:text-xs font-medium mobile:mt-px mr-1.5">{`${
              getToken(info.baseMint)?.symbol ?? 'unknown'
            }-${getToken(info.quoteMint)?.symbol ?? 'unknown'}`}</div>
          )}
        </div>
      </AutoBox>
    )
  }
  const { base, quote, name } = info
  return (
    <AutoBox
      is={isMobile ? 'Col' : 'Row'}
      className={twMerge('flex-wrap items-center mobile:items-start gap-x-2 gap-y-1', className)}
    >
      <CoinAvatarPair className="justify-self-center mr-2" size={isMobile ? 'sm' : 'md'} token1={base} token2={quote} />
      <div className="mobile:text-xs font-medium mobile:mt-px mr-1.5">{name}</div>
      {info.isClosedPool && <Badge cssColor="#DA2EEF">Inactive</Badge>}
      {isStable && <Badge>Stable</Badge>}
      {info.isDualFusionPool && info.version !== 6 && <Badge cssColor="#DA2EEF">Dual Yield</Badge>}
      {info.isNewPool && <Badge cssColor="#00d1ff">New</Badge>}
      {info.isUpcomingPool && <Badge cssColor="#5dadee">Upcoming</Badge>}
    </AutoBox>
  )
}

function TextInfoItem({
  name,
  value,
  subValue,
  className
}: {
  name: string
  value?: ReactNode
  subValue?: ReactNode
  className?: string
}) {
  const isMobile = useAppSettings((s) => s.isMobile)
  return (
    <Col className={className}>
      {isMobile && <div className=" mb-1 text-[rgba(171,196,255,0.5)] font-medium text-sm mobile:text-2xs">{name}</div>}
      <Col className="flex-grow justify-center">
        <div className="text-base mobile:text-xs">{value || '--'}</div>
        {subValue && <div className="text-sm mobile:text-2xs text-[rgba(171,196,255,0.5)]">{subValue}</div>}
      </Col>
    </Col>
  )
}

function FarmCardTooltipPanelAddressItem({
  className,
  address,
  type = 'account'
}: {
  className?: string
  address: string
  type?: 'token' | 'account'
}) {
  return (
    <Row className={twMerge('grid w-full gap-2 items-center grid-cols-[1fr,auto]', className)}>
      <Row className="text-xs font-normal text-white">
        {/* setting text-overflow empty string will make effect in FireFox, not Chrome */}
        <div className="self-end overflow-hidden tracking-wide">{address.slice(0, 6)}</div>
        <div className="tracking-wide">...</div>
        <div className="overflow-hidden tracking-wide">{address.slice(-6)}</div>
      </Row>
      <Row className="gap-1 items-center">
        <Icon
          size="sm"
          heroIconName="clipboard-copy"
          className="clickable text-[#abc4ff]"
          onClick={() => {
            copyToClipboard(address)
          }}
        />
        <Link href={`https://solscan.io/${type}/${address}`}>
          <Icon size="sm" heroIconName="external-link" className="clickable text-[#abc4ff]" />
        </Link>
      </Row>
    </Row>
  )
}
