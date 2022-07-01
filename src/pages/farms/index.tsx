import { Fragment, ReactNode, useMemo, useRef, useState } from 'react'

import { TokenAmount } from '@raydium-io/raydium-sdk'

import { twMerge } from 'tailwind-merge'

import useAppSettings from '@/application/appSettings/useAppSettings'
import { isJsonFarmInfo } from '@/application/farms/judgeFarmInfo'
import txFarmDeposit from '@/application/farms/txFarmDeposit'
import txFarmHarvest from '@/application/farms/txFarmHarvest'
import txFarmWithdraw from '@/application/farms/txFarmWithdraw'
import { FarmPoolJsonInfo, HydratedFarmInfo, HydratedRewardInfo } from '@/application/farms/type'
import useFarms, { useFarmFavoriteIds } from '@/application/farms/useFarms'
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
import List from '@/components/List'
import LoadingCircle from '@/components/LoadingCircle'
import PageLayout from '@/components/PageLayout'
import Popover from '@/components/Popover'
import RefreshCircle from '@/components/RefreshCircle'
import ResponsiveDialogDrawer from '@/components/ResponsiveDialogDrawer'
import Row from '@/components/Row'
import Select from '@/components/Select'
import Switcher from '@/components/Switcher'
import Tabs from '@/components/Tabs'
import Tooltip from '@/components/Tooltip'
import { addItem, removeItem, shakeFalsyItem } from '@/functions/arrayMethods'
import { toUTC } from '@/functions/date/dateFormat'
import formatNumber from '@/functions/format/formatNumber'
import toPubString from '@/functions/format/toMintString'
import toPercentString from '@/functions/format/toPercentString'
import { toTokenAmount } from '@/functions/format/toTokenAmount'
import toTotalPrice from '@/functions/format/toTotalPrice'
import toUsdVolume from '@/functions/format/toUsdVolume'
import { isMintEqual } from '@/functions/judgers/areEqual'
import { gt, gte, isMeaningfulNumber } from '@/functions/numberish/compare'
import { toString } from '@/functions/numberish/toString'
import { toggleSetItem } from '@/functions/setMethods'
import useSort from '@/hooks/useSort'
import useCreateFarms from '@/application/createFarm/useCreateFarm'
import { searchItems } from '@/functions/searchItems'
import { useFarmUrlParser } from '@/application/farms/useFarmUrlParser'
import copyToClipboard from '@/functions/dom/copyToClipboard'
import useNotification from '@/application/notification/useNotification'

export default function FarmsPage() {
  useFarmUrlParser()
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
    <Row className="flex-wrap items-center justify-center px-2 py-1 mb-2">
      {/* <div className="text-lg font-semibold justify-self-start text-white -mb-1">Farms</div> */}
      {/* <div className="font-medium text-[rgba(196,214,255,.5)] text-2xs">
          Stake your LP tokens and earn token rewards
        </div> */}
      <FarmTabBlock />
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
          <div className={twMerge('frosted-glass-teal rounded-full p-2 clickable justify-self-start', className)}>
            <Icon className="w-3 h-3" iconClassName="w-3 h-3" heroIconName="dots-horizontal" />
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
  return (
    <Input
      value={storeSearchText}
      className={twMerge(
        'px-2 py-2 mobile:py-1 gap-2  border-1.5 border-[rgba(196,214,255,0.5)] rounded-xl min-w-[7em]',
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
            useFarms.setState({ searchText: '' })
          }}
        />
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
    <Row className="justify-self-end  mobile:justify-self-auto flex-wrap items-center">
      <span className="text-[rgba(196,214,255,0.5)] font-medium text-sm mobile:text-xs">Show Staked</span>
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
    <Row className="justify-self-end  mobile:justify-self-auto flex-wrap items-center">
      <span className="text-[rgba(196,214,255,0.5)] font-medium text-sm mobile:text-xs">Show Created</span>
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
  const haveStakeOver300Ray = gte(userRayBalance ?? 0, 0 /* FIXME : for Test, true is 300  */)
  return (
    <Row
      className={`justify-self-end  mobile:justify-self-auto gap-1 flex-wrap items-center opacity-100 pointer-events-auto clickable transition`}
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
  return (
    <Tabs
      currentValue={currentTab}
      values={shakeFalsyItem([
        'All',
        // 'Raydium',
        'Fusion',
        isMobile ? undefined : 'Ecosystem',
        'Inactive'
      ] as const)}
      onChange={(tab) => useFarms.setState({ currentTab: tab })}
      className={twMerge('justify-self-center mobile:col-span-full', className)}
      itemClassName={isMobile ? 'w-[80px] h-[30px]' : ''}
    />
  )
}

function FarmTableSorterBlock({
  className,
  onChange
}: {
  className?: string
  onChange?: (newKey: 'name' | 'totalApr' | 'tvl' | 'favorite' | undefined) => void
}) {
  return (
    <Select
      className={className}
      candidateValues={[
        { label: 'Farm', value: 'name' },
        { label: 'APRS', value: 'totalApr' },
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
  const jsonInfo = useFarms((s) => s.jsonInfos)

  const hydratedInfos = useFarms((s) => s.hydratedInfos)

  const currentTab = useFarms((s) => s.currentTab)
  const onlySelfFarms = useFarms((s) => s.onlySelfFarms)
  const onlySelfCreatedFarms = useFarms((s) => s.onlySelfCreatedFarms)
  const searchText = useFarms((s) => s.searchText)
  const lpTokens = useToken((s) => s.lpTokens)

  const [favouriteIds] = useFarmFavoriteIds()

  const isMobile = useAppSettings((s) => s.isMobile)
  const owner = useWallet((s) => s.owner)

  const dataSource = useMemo(
    () =>
      hydratedInfos.filter((i) => lpTokens[toPubString(i.lpMint)]).filter((i) => (isMobile ? i.version !== 6 : true)),
    [lpTokens, hydratedInfos]
  )

  const tabedDataSource = useMemo(
    () =>
      dataSource.filter(
        (i) =>
          // currentTab === 'Upcoming'
          //   ? i.isUpcomingPool
          //   : // : currentTab === 'Raydium'
          // ? i.isRaydiumPool && !i.isClosedPool

          currentTab === 'Fusion'
            ? (i.isNormalFusionPool || i.isDualFusionPool) && i.version !== 6
            : currentTab === 'Inactive'
            ? i.isClosedPool && !i.isStakePool && i.version !== 6
            : currentTab === 'Ecosystem'
            ? i.version === 6
            : (i.isUpcomingPool || (!i.isClosedPool && !i.isStakePool)) && i.version !== 6 // currentTab == 'all'
      ),
    [currentTab, dataSource]
  )

  const haveSelfCreatedFarm = tabedDataSource.some((i) => isMintEqual(i.creator, owner))

  const applyFiltersDataSource = useMemo(
    () =>
      tabedDataSource
        .filter((i) => (onlySelfFarms ? i.ledger && isMeaningfulNumber(i.ledger.deposited) : true)) // Switch
        .filter((i) => (i.version === 6 && onlySelfCreatedFarms && owner ? isMintEqual(i.creator, owner) : true)), // Switch
    [onlySelfFarms, searchText, onlySelfCreatedFarms, tabedDataSource, owner]
  )

  const applySearchedDataSource = useMemo(
    () =>
      searchItems(applyFiltersDataSource, {
        text: searchText,
        matchConfigs: (i) => [
          { text: toPubString(i.id), entirely: true },
          { text: i.ammId, entirely: true }, // Input Auto complete result sort setting
          { text: toPubString(i.base?.mint), entirely: true },
          { text: toPubString(i.quote?.mint), entirely: true },
          i.base?.symbol,
          i.quote?.symbol,
          i.base?.name,
          i.quote?.name
        ]
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
      sortCompare: [(i) => i.isUpcomingPool, /* (i) => i.isNewPool, */ (i) => favouriteIds?.includes(toPubString(i.id))]
    }
  })

  const isLoading = useFarms((s) => s.isLoading)

  // NOTE: filter widgets
  const innerFarmDatabaseWidgets = isMobile ? (
    <div>
      <Row className="mb-2 gap-2">
        <FarmSearchBlock className="grow-2" />
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
    <Row className="justify-between flex-wrap gap-8 items-center mb-4">
      <div>
        <div className="font-medium text-white text-lg">All Farms</div>
        <div className="font-medium text-[rgba(196,214,255,.5)] text-base ">
          Stake your LP tokens and earn token rewards
        </div>
      </div>
      <Row className="items-center gap-8">
        {haveSelfCreatedFarm && <FarmSlefCreatedOnlyBlock />}
        <FarmStakedOnlyBlock />
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
          className="mb-3 h-12  sticky -top-6 backdrop-filter z-10 backdrop-blur-md bg-[rgba(20,16,65,0.2)] mr-scrollbar rounded-xl gap-2 grid-cols-[auto,1.5fr,1.2fr,1fr,1fr,auto]"
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
            className="font-medium text-[#ABC4FF] text-sm items-center cursor-pointer  clickable clickable-filter-effect no-clicable-transform-effect"
            onClick={() => {
              setSortConfig({
                key: 'name',
                sortModeQueue: ['increase', 'decrease', 'none'],
                sortCompare: (i) => i.name
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
          <div className="pl-2 font-medium self-center text-[#ABC4FF] text-sm">Pending Reward</div>

          {/* table head column: Total APR */}
          <Row
            className="pl-2 font-medium items-center text-[#ABC4FF] text-sm cursor-pointer gap-1  clickable clickable-filter-effect no-clicable-transform-effect"
            onClick={() => setSortConfig({ key: 'totalApr', sortCompare: (i) => i.totalApr })}
          >
            Total APR
            <Tooltip>
              <Icon className="ml-1" size="sm" heroIconName="question-mark-circle" />
              <Tooltip.Panel>Estimated APR based on trading fees earned by the pool in the past 30D</Tooltip.Panel>
            </Tooltip>
            <Icon
              className="ml-1"
              size="sm"
              iconSrc={
                sortConfig?.key === 'totalApr' && sortConfig.mode !== 'none'
                  ? sortConfig?.mode === 'decrease'
                    ? '/icons/msic-sort-down.svg'
                    : '/icons/msic-sort-up.svg'
                  : '/icons/msic-sort.svg'
              }
            />
          </Row>

          {/* table head column: TVL */}
          <Row
            className="pl-2 font-medium text-[#ABC4FF] text-sm items-center cursor-pointer  clickable clickable-filter-effect no-clicable-transform-effect"
            onClick={() => setSortConfig({ key: 'tvl', sortCompare: (i) => i.tvl })}
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

      <FarmCardDatabaseBody isLoading={isLoading} sortedHydratedFarmInfos={sortedData} jsonInfos={jsonInfo} />
    </CyberpunkStyleCard>
  )
}

function FarmCardDatabaseBody({
  isLoading,
  sortedHydratedFarmInfos,
  jsonInfos
}: {
  isLoading: boolean
  sortedHydratedFarmInfos: HydratedFarmInfo[]
  jsonInfos: FarmPoolJsonInfo[]
}) {
  const expandedItemIds = useFarms((s) => s.expandedItemIds)
  const [favouriteIds, setFavouriteIds] = useFarmFavoriteIds()
  const infos = isLoading ? jsonInfos : sortedHydratedFarmInfos
  return (
    <>
      {sortedHydratedFarmInfos.length || jsonInfos.length ? (
        <List className="gap-3 text-[#ABC4FF] flex-1 -mx-2 px-2" /* let scrollbar have some space */>
          {infos.map((info: FarmPoolJsonInfo | HydratedFarmInfo) => (
            <List.Item key={String(info.id)}>
              <Collapse
                open={expandedItemIds.has(String(info.id))}
                onToggle={() => {
                  useFarms.setState((s) => ({ expandedItemIds: toggleSetItem(s.expandedItemIds, String(info.id)) }))
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
function FarmRewardBadge({ farmInfo, reward }: { farmInfo: HydratedFarmInfo; reward: HydratedRewardInfo }) {
  return (
    <Tooltip placement="bottom">
      <Row
        className={`ring-1 ring-inset ring-[#abc4ff80] p-1 rounded-full items-center gap-2 ${
          reward.isRewarding ? '' : 'opacity-70'
        }`}
      >
        {isMeaningfulNumber(reward.userPendingReward) && (
          <div className="text-xs translate-y-0.125 pl-1">
            {formatNumber(toString(reward.userPendingReward), {
              fractionLength: 3
            })}
          </div>
        )}
        <CoinAvatar size="sm" token={reward.token} />
      </Row>
      <Tooltip.Panel>
        <div className="mb-1">
          {reward.token?.symbol ?? '--'} Reward Period {reward.isRewardEnded ? 'ended' : ''}
        </div>
        <div className="opacity-50">
          {toUTC(reward.openTime, { hideTimeDetail: true })} ~ {toUTC(reward.endTime, { hideTimeDetail: true })}
        </div>
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
                : info.rewards.map((reward) => {
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
            <div>
              {isJsonFarmInfo(info)
                ? '--'
                : info.rewards.map(
                    ({ token, userPendingReward, userHavedReward }) =>
                      userHavedReward && (
                        <div key={toPubString(token?.mint)}>
                          {toString(userPendingReward) || '0'} {token?.symbol}
                        </div>
                      )
                  )}
            </div>
          }
        />
      )}

      <TextInfoItem
        name="Total APR"
        value={
          isJsonFarmInfo(info) ? (
            '--'
          ) : (
            <Tooltip placement="right">
              {info.totalApr ? toPercentString(info.totalApr) : '--'}
              <Tooltip.Panel>
                {info.raydiumFeeRpr && (
                  <div className="whitespace-nowrap">Fees {toPercentString(info.raydiumFeeRpr)}</div>
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
            name="Total APR"
            value={
              isJsonFarmInfo(info) ? (
                '--'
              ) : (
                <Tooltip placement="right">
                  {info.totalApr ? toPercentString(info.totalApr) : '--'}
                  <Tooltip.Panel>
                    {info.raydiumFeeRpr && (
                      <div className="whitespace-nowrap">Fees {toPercentString(info.raydiumFeeRpr)}</div>
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
          is={isMobile ? 'Col' : 'Row'}
          className="gap-8 mobile:gap-3 flex-grow px-8 py-5 mobile:px-4 mobile:py-3"
        >
          <Row className="p-6 mobile:py-3 mobile:px-4 flex-grow ring-inset ring-1.5 mobile:ring-1 ring-[rgba(171,196,255,.5)] rounded-3xl mobile:rounded-xl items-center gap-3">
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
                      className="grid place-items-center w-10 h-10 mobile:w-8 mobile:h-8 ring-inset ring-1.5 mobile:ring-1 ring-[rgba(171,196,255,.5)] rounded-xl mobile:rounded-lg text-[rgba(171,196,255,.5)] clickable clickable-filter-effect"
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
            className="p-6 mobile:py-3 mobile:px-4 flex-grow ring-inset ring-1.5 mobile:ring-1 ring-[rgba(171,196,255,.5)] rounded-3xl mobile:rounded-xl items-center gap-3"
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
                  {farmInfo.rewards?.map((reward, idx) => (
                    <div key={idx} className="p-4">
                      <div className={`text-white font-medium text-sm mobile:text-xs mb-0.5`}>
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
                        <div className={`text-white font-medium text-base mobile:text-xs`}>
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
                {
                  should: hasPendingReward
                }
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
                className="grid place-items-center w-10 h-10 mobile:w-8 mobile:h-8 ring-inset ring-1.5 mobile:ring-1 ring-[rgba(171,196,255,.5)] rounded-xl mobile:rounded-lg text-[rgba(171,196,255,.5)] clickable clickable-filter-effect"
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
                className="grid place-items-center w-10 h-10 mobile:w-8 mobile:h-8 ring-inset ring-1.5 mobile:ring-1 ring-[rgba(171,196,255,.5)] rounded-xl mobile:rounded-lg text-[rgba(171,196,255,.5)] clickable clickable-filter-effect"
                onClick={() => {
                  routeTo('/liquidity/add', { queryProps: { ammId: farmInfo.ammId } })
                }}
              />
              <Icon
                size="sm"
                iconSrc="/icons/msic-swap-h.svg"
                className="grid place-items-center w-10 h-10 mobile:w-8 mobile:h-8 ring-inset ring-1.5 mobile:ring-1 ring-[rgba(171,196,255,.5)] rounded-xl mobile:rounded-lg text-[rgba(171,196,255,.5)] clickable clickable-filter-effect"
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
                  className="grid place-items-center w-10 h-10 mobile:w-8 mobile:h-8 ring-inset ring-1.5 mobile:ring-1 ring-[rgba(171,196,255,.5)] rounded-xl mobile:rounded-lg text-[rgba(171,196,255,.5)] clickable clickable-filter-effect"
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
                  className="grid place-items-center w-10 h-10 mobile:w-8 mobile:h-8 ring-inset ring-1.5 mobile:ring-1 ring-[rgba(171,196,255,.5)] rounded-xl mobile:rounded-lg text-[rgba(171,196,255,.5)] clickable clickable-filter-effect"
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
                  className="grid place-items-center w-10 h-10 mobile:w-8 mobile:h-8 ring-inset ring-1.5 mobile:ring-1 ring-[rgba(171,196,255,.5)] rounded-xl mobile:rounded-lg text-[rgba(171,196,255,.5)] clickable clickable-filter-effect"
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
  const isStable = isJsonFarmInfo(info) ? false : info.isStablePool

  if (isJsonFarmInfo(info)) {
    const lpToken = getLpToken(info.lpMint)
    const name = lpToken ? `${lpToken.base.symbol ?? '--'} - ${lpToken.quote.symbol ?? '--'}` : '--' // TODO: rule of get farm name should be a issolate function
    return (
      <AutoBox
        is={isMobile ? 'Col' : 'Row'}
        className={twMerge('flex-wrap items-center mobile:items-start', className)}
      >
        <CoinAvatarPair
          className="justify-self-center mr-2"
          size={isMobile ? 'sm' : 'md'}
          token1={lpToken?.base}
          token2={lpToken?.quote}
        />
        {lpToken ? (
          <div>
            <div className="mobile:text-xs font-medium mobile:mt-px mr-1.5">{name}</div>
          </div>
        ) : null}
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
      {info.version === 6 && info.isClosedPool && <Badge cssColor="#DA2EEF">Inactive</Badge>}
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
    <Col className={twMerge('w-max', className)}>
      {isMobile && <div className=" mb-1 text-[rgba(171,196,255,0.5)] font-medium text-sm mobile:text-2xs">{name}</div>}
      <Col className="flex-grow justify-center">
        <div className="text-base mobile:text-xs">{value || '--'}</div>
        {subValue && <div className="text-sm mobile:text-2xs text-[rgba(171,196,255,0.5)]">{subValue}</div>}
      </Col>
    </Col>
  )
}
