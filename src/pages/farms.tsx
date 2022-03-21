import React, { ReactNode, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/router'

import { Fraction, TokenAmount, ZERO } from '@raydium-io/raydium-sdk'

import { twMerge } from 'tailwind-merge'

import useAppSettings from '@/application/appSettings/useAppSettings'
import txFarmDeposit from '@/application/farms/transaction/txFarmDeposit'
import txFarmHarvest from '@/application/farms/transaction/txFarmHarvest'
import txFarmWithdraw from '@/application/farms/transaction/txFarmWithdraw'
import { FarmPoolJsonInfo, HydratedFarmInfo } from '@/application/farms/type'
import useFarms, { useFarmFavoriteIds } from '@/application/farms/useFarms'
import { usePools } from '@/application/pools/usePools'
import { routeTo } from '@/application/routeTools'
import useToken from '@/application/token/useToken'
import useWallet from '@/application/wallet/useWallet'
import AutoBox from '@/components/AutoBox'
import Button, { ButtonHandle } from '@/components/Button'
import Card from '@/components/Card'
import CoinAvatarPair from '@/components/CoinAvatarPair'
import CoinInputBox, { CoinInputBoxHandle } from '@/components/CoinInputBox'
import Col from '@/components/Col'
import Collapse from '@/components/Collapse'
import CyberpunkStyleCard from '@/components/CyberpunkStyleCard'
import Grid from '@/components/Grid'
import Icon from '@/components/Icon'
import Input from '@/components/Input'
import List from '@/components/List'
import PageLayout from '@/components/PageLayout'
import RefreshCircle from '@/components/RefreshCircle'
import ResponsiveDialogDrawer from '@/components/ResponsiveDialogDrawer'
import Row from '@/components/Row'
import Select from '@/components/Select'
import Switcher from '@/components/Switcher'
import Tabs from '@/components/Tabs'
import Tooltip from '@/components/Tooltip'
import { addItem, removeItem, shakeFalsyItem } from '@/functions/arrayMethods'
import formatNumber from '@/functions/format/formatNumber'
import toPercentString from '@/functions/format/toPercentString'
import { toTokenAmount } from '@/functions/format/toTokenAmount'
import toTotalPrice from '@/functions/format/toTotalPrice'
import toUsdVolume from '@/functions/format/toUsdVolume'
import { gt, gte, isMeaningfulNumber } from '@/functions/numberish/compare'
import { add } from '@/functions/numberish/operations'
import { toString } from '@/functions/numberish/toString'
import useSort from '@/hooks/useSort'

import { toggleSetItem } from '../functions/setMethods'
import Popover from '@/components/Popover'
import LoadingCircle from '@/components/LoadingCircle'
import toPubString from '@/functions/format/toMintString'
import { Badge } from '@/components/Badge'
import { isFarmJsonInfo } from '@/application/farms/utils/judgeFarmInfo'

export default function FarmsPage() {
  return (
    <PageLayout mobileBarTitle="Farms" contentIsFixedLength metaTitle="Farms - Raydium">
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
        <FarmStakedOnlyBlock />
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
              className="flex flex-col shadow-xl backdrop-filter backdrop-blur-xl py-3 px-4  max-h-[80vh] border-1.5 border-[rgba(171,196,255,0.2)]"
              size="lg"
              style={{
                background:
                  'linear-gradient(140.14deg, rgba(0, 182, 191, 0.15) 0%, rgba(27, 22, 89, 0.1) 86.61%), linear-gradient(321.82deg, #18134D 0%, #1B1659 100%)',
                boxShadow: '0px 8px 48px rgba(171, 196, 255, 0.12)'
              }}
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
        'px-2 py-2 mobile:py-1 gap-2 border-1.5 border-[rgba(196,214,255,0.5)] rounded-xl min-w-[7em]',
        className
      )}
      inputClassName="font-medium mobile:text-xs text-[rgba(196,214,255,0.5)] placeholder-[rgba(196,214,255,0.5)]"
      prefix={<Icon heroIconName="search" size={isMobile ? 'sm' : 'md'} className="text-[rgba(196,214,255,0.5)]" />}
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
      placeholder="Search by token"
      onUserInput={(searchText) => {
        useFarms.setState({ searchText })
      }}
    />
  )
}

function FarmStakedOnlyBlock({ className }: { className?: string }) {
  const onlySelfFarms = useFarms((s) => s.onlySelfFarms)
  return (
    <Row className="justify-self-end  mobile:justify-self-auto flex-wrap items-center">
      <span className="text-[rgba(196,214,255,0.5)] font-medium mobile:text-xs">Show Staked</span>
      <Switcher
        className="ml-2 "
        defaultChecked={onlySelfFarms}
        onToggle={(isOnly) => useFarms.setState({ onlySelfFarms: isOnly })}
      />
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
      <span className="text-[rgba(196,214,255,0.5)] font-medium mobile:text-xs">Refresh farms</span>
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
  const searchText = useFarms((s) => s.searchText)
  const lpTokens = useToken((s) => s.lpTokens)

  const [favouriteIds] = useFarmFavoriteIds()

  const dataSource = useMemo(
    () =>
      hydratedInfos
        // TEMP current not includes stable coin's farm
        .filter((i) => lpTokens[i.jsonInfo.lpMint])
        // .filter((info) => info.isDualFusionPool) // TEMP for test
        .filter(
          (i) =>
            // currentTab === 'Upcoming'
            //   ? i.isUpcomingPool
            //   : // : currentTab === 'Raydium'
            // ? i.isRaydiumPool && !i.isClosedPool
            currentTab === 'Fusion'
              ? i.isNormalFusionPool || i.isDualFusionPool
              : currentTab === 'Inactive'
              ? i.isClosedPool && !i.isStakePool
              : i.isUpcomingPool || (!i.isClosedPool && !i.isStakePool) // currentTab == 'all'
        ) // Tab
        .filter((i) => (onlySelfFarms ? i.ledger && isMeaningfulNumber(i.ledger.deposited) : true)) // Switch
        .filter((i) => {
          // Search
          if (!searchText) return true
          const searchKeyWords = searchText.split(/\s|-/)
          return searchKeyWords.every((keyWord) => i.name.toLowerCase().includes(keyWord.toLowerCase()))
        }),
    [lpTokens, currentTab, onlySelfFarms, searchText, hydratedInfos]
  )

  const {
    sortedData,
    setConfig: setSortConfig,
    sortConfig,
    clearSortConfig
  } = useSort(dataSource, {
    defaultSort: {
      key: 'defaultKey',
      pickSortValue: [(i) => i.isUpcomingPool, (i) => i.isNewPool, (i) => favouriteIds?.includes(toPubString(i.id))]
    }
  })
  const isMobile = useAppSettings((s) => s.isMobile)
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
                  pickSortValue:
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

      <FarmSearchBlock />
    </Row>
  )

  return (
    <CyberpunkStyleCard
      haveMinHeight
      wrapperClassName="flex-1 overflow-hidden flex flex-col"
      className="p-10 pt-6 pb-4 mobile:px-3 mobile:py-3 w-full flex flex-col h-full"
      size="lg"
      style={{
        background:
          'linear-gradient(140.14deg, rgba(0, 182, 191, 0.15) 0%, rgba(27, 22, 89, 0.1) 86.61%), linear-gradient(321.82deg, #18134D 0%, #1B1659 100%)'
      }}
    >
      {innerFarmDatabaseWidgets}
      {!isMobile && (
        <Row
          type="grid-x"
          className="mb-3 h-12  sticky -top-6 backdrop-filter z-10 backdrop-blur-md bg-[rgba(20,16,65,0.2)] mr-scrollbar rounded-xl gap-2 grid-cols-[auto,1.5fr,1fr,1fr,1fr,auto]"
        >
          <Row
            className="group w-20 pl-10 font-medium text-[#ABC4FF] text-sm items-center cursor-pointer  clickable clickable-filter-effect no-clicable-transform-effect"
            onClick={() => {
              setSortConfig({
                key: 'favorite',
                sortModeQueue: ['decrease', 'none'],
                pickSortValue: (i) => favouriteIds?.includes(toPubString(i.id))
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
            className=" font-medium text-[#ABC4FF] text-sm items-center cursor-pointer  clickable clickable-filter-effect no-clicable-transform-effect"
            onClick={() => {
              setSortConfig({
                key: 'name',
                sortModeQueue: ['increase', 'decrease', 'none'],
                pickSortValue: (i) => i.name
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
            onClick={() => setSortConfig({ key: 'totalApr', pickSortValue: (i) => i.totalApr })}
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
            onClick={() => setSortConfig({ key: 'tvl', pickSortValue: (i) => i.tvl })}
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
                  {isLoading ? null : (
                    <FarmCardDatabaseBodyCollapseItemContent hydratedInfo={info as HydratedFarmInfo} />
                  )}
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
function FarmCardDatabaseBodyCollapseItemFace({
  open,
  info,
  isFavourite,
  onUnFavorite,
  onStartFavorite
}: {
  open: boolean
  info: HydratedFarmInfo | FarmPoolJsonInfo
  isFavourite?: boolean
  onUnFavorite?: (farmId: string) => void
  onStartFavorite?: (farmId: string) => void
}) {
  const isMobile = useAppSettings((s) => s.isMobile)

  const pcCotent = (
    <Row
      type="grid-x"
      className={`py-5 mobile:py-4 mobile:px-5 bg-[#141041] items-stretch gap-2 grid-cols-[auto,1.5fr,1fr,1fr,1fr,auto] mobile:grid-cols-[1fr,1fr,1fr,auto] rounded-t-3xl mobile:rounded-t-lg ${
        open ? '' : 'rounded-b-3xl mobile:rounded-b-lg'
      } transition-all`}
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

      <TextInfoItem
        name="Pending Rewards"
        value={
          <div>
            {isFarmJsonInfo(info)
              ? '--'
              : info.rewards.map(
                  ({ token, pendingReward, canBeRewarded }, idx) =>
                    canBeRewarded && (
                      <div key={idx}>
                        {toString(pendingReward) || '0'} {token?.symbol}
                      </div>
                    )
                )}
          </div>
        }
      />

      <TextInfoItem
        name="Total APR"
        value={
          isFarmJsonInfo(info) ? (
            '--'
          ) : (
            <Tooltip placement="right">
              {info.totalApr ? toPercentString(info.totalApr) : '--'}
              <Tooltip.Panel>
                {info.raydiumFeeRpr && (
                  <div className="whitespace-nowrap">Fees {toPercentString(info.raydiumFeeRpr)}</div>
                )}
                {info.rewards.map(
                  ({ apr, token, canBeRewarded }, idx) =>
                    canBeRewarded && (
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
        value={isFarmJsonInfo(info) ? '--' : info.tvl ? `~${toUsdVolume(info.tvl, { decimalPlace: 0 })}` : '--'}
        subValue={
          isFarmJsonInfo(info)
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
              isFarmJsonInfo(info)
                ? '--'
                : info.tvl
                ? `≈${toUsdVolume(info.tvl, { autoSuffix: true, decimalPlace: 0 })}`
                : '--'
            }
            subValue={
              isFarmJsonInfo(info)
                ? '--'
                : info.stakedLpAmount && `${formatNumber(toString(info.stakedLpAmount, { decimalLength: 0 }))} LP`
            }
          />

          <TextInfoItem
            name="Total APR"
            value={
              isFarmJsonInfo(info) ? (
                '--'
              ) : (
                <Tooltip placement="right">
                  {info.totalApr ? toPercentString(info.totalApr) : '--'}
                  <Tooltip.Panel>
                    {info.raydiumFeeRpr && (
                      <div className="whitespace-nowrap">Fees {toPercentString(info.raydiumFeeRpr)}</div>
                    )}
                    {info.rewards.map(
                      ({ apr, token, canBeRewarded }, idx) =>
                        canBeRewarded && (
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

function FarmCardDatabaseBodyCollapseItemContent({ hydratedInfo }: { hydratedInfo: HydratedFarmInfo }) {
  const lpPrices = usePools((s) => s.lpPrices)
  const prices = useToken((s) => s.tokenPrices)
  const isMobile = useAppSettings((s) => s.isMobile)
  const lightBoardClass = 'bg-[rgba(20,16,65,.2)]'
  const { push } = useRouter()
  const connected = useWallet((s) => s.connected)

  const balances = useWallet((s) => s.balances)
  const hasLp = isMeaningfulNumber(balances[toPubString(hydratedInfo.lpMint)])
  const hasPendingReward = useMemo(
    () =>
      gt(
        hydratedInfo.rewards.reduce((acc, reward) => add(acc, reward.pendingReward ?? ZERO), new Fraction(ZERO)),
        ZERO
      ),
    [hydratedInfo]
  )
  return (
    <AutoBox
      is={isMobile ? 'Col' : 'Row'}
      className={`mobile:gap-3 rounded-b-3xl mobile:rounded-b-lg`}
      style={{
        background: 'linear-gradient(126.6deg, rgba(171, 196, 255, 0.12), rgb(171 196 255 / 4%) 100%)'
      }}
    >
      <AutoBox is={isMobile ? 'Col' : 'Row'} className="gap-8 mobile:gap-3 flex-grow px-8 py-5 mobile:px-4 mobile:py-3">
        <Row className="p-6 mobile:py-3 mobile:px-4 flex-grow ring-inset ring-1.5 mobile:ring-1 ring-[rgba(171,196,255,.5)] rounded-3xl mobile:rounded-xl items-center gap-3">
          <div className="flex-grow">
            <div className="text-[rgba(171,196,255,0.5)] font-medium text-sm mobile:text-2xs mb-1">Deposited</div>
            <div className="text-white font-medium text-base mobile:text-xs">
              {lpPrices[String(hydratedInfo.lpMint)] && hydratedInfo.userStakedLpAmount
                ? toUsdVolume(toTotalPrice(hydratedInfo.userStakedLpAmount, lpPrices[String(hydratedInfo.lpMint)]))
                : '--'}
            </div>
            {hydratedInfo.userStakedLpAmount && (
              <div className="text-[rgba(171,196,255,0.5)] font-medium text-sm mobile:text-xs">
                {formatNumber(toString(hydratedInfo.userStakedLpAmount), {
                  fractionLength: hydratedInfo.userStakedLpAmount?.token.decimals
                })}{' '}
                LP
              </div>
            )}
          </div>
          <Row className="gap-3">
            {hydratedInfo.userHasStaked ? (
              <>
                <Button
                  className="frosted-glass-teal mobile:px-6 mobile:py-2 mobile:text-xs"
                  disabled={(hydratedInfo.isClosedPool && !hydratedInfo.isUpcomingPool) || !hasLp}
                  onClick={() => {
                    if (connected) {
                      useFarms.setState({
                        isStakeDialogOpen: true,
                        stakeDialogMode: 'deposit',
                        stakeDialogInfo: hydratedInfo
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
                          stakeDialogInfo: hydratedInfo
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
                  {
                    should: connected,
                    forceActive: true,
                    fallbackProps: {
                      children: 'Connect Wallet',
                      onClick: () => useAppSettings.setState({ isWalletSelectorShown: true })
                    }
                  },
                  { should: hasLp }
                ]}
                onClick={() => {
                  useFarms.setState({
                    isStakeDialogOpen: true,
                    stakeDialogMode: 'deposit',
                    stakeDialogInfo: hydratedInfo
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
          <Row className="flex-grow divide-x-1.5 w-full">
            {hydratedInfo.rewards?.map(
              (reward, idx) =>
                reward.canBeRewarded && (
                  <div
                    key={idx}
                    className={`px-4 ${idx === 0 ? 'pl-0' : ''} ${
                      idx === hydratedInfo.rewards.length - 1 ? 'pr-0' : ''
                    } border-[rgba(171,196,255,.5)]`}
                  >
                    <div className="text-[rgba(171,196,255,0.5)] font-medium text-sm mobile:text-2xs mb-1">
                      Pending rewards
                    </div>
                    <div className="text-white font-medium text-base mobile:text-xs">
                      {toString(reward.pendingReward) || '0'} {reward.token?.symbol}
                    </div>
                    <div className="text-[rgba(171,196,255,0.5)] font-medium text-sm mobile:text-2xs">
                      {prices?.[String(reward.token?.mint)] && reward?.pendingReward
                        ? toUsdVolume(toTotalPrice(reward.pendingReward, prices[String(reward.token?.mint)]))
                        : null}
                    </div>
                  </div>
                )
            )}
          </Row>
          <Button
            // disable={Number(info.pendingReward?.numerator) <= 0}
            className="frosted-glass-teal rounded-xl mobile:w-full mobile:py-2 mobile:text-xs whitespace-nowrap"
            onClick={() => {
              txFarmHarvest(hydratedInfo, {
                isStaking: false,
                rewardAmounts: hydratedInfo.rewards
                  .map(({ pendingReward }) => pendingReward)
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
              heroIconName="plus"
              className="grid place-items-center w-10 h-10 mobile:w-8 mobile:h-8 ring-inset ring-1.5 mobile:ring-1 ring-[rgba(171,196,255,.5)] rounded-xl mobile:rounded-lg text-[rgba(171,196,255,.5)] clickable clickable-filter-effect"
              onClick={() => {
                routeTo('/liquidity/add', { queryProps: { ammId: hydratedInfo.ammId } })
              }}
            />
            <Icon
              size="sm"
              iconSrc="/icons/msic-swap-h.svg"
              className="grid place-items-center w-10 h-10 mobile:w-8 mobile:h-8 ring-inset ring-1.5 mobile:ring-1 ring-[rgba(171,196,255,.5)] rounded-xl mobile:rounded-lg text-[rgba(171,196,255,.5)] clickable clickable-filter-effect"
              onClick={() => {
                routeTo('/swap', { queryProps: { coin1: hydratedInfo.base, coin2: hydratedInfo.quote } })
              }}
            />
          </Row>
        ) : (
          <>
            <Tooltip>
              <Icon
                size="smi"
                heroIconName="plus"
                className="grid place-items-center w-10 h-10 mobile:w-8 mobile:h-8 ring-inset ring-1.5 mobile:ring-1 ring-[rgba(171,196,255,.5)] rounded-xl mobile:rounded-lg text-[rgba(171,196,255,.5)] clickable clickable-filter-effect"
                onClick={() => {
                  routeTo('/liquidity/add', { queryProps: { ammId: hydratedInfo.ammId } })
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
                  routeTo('/swap', { queryProps: { coin1: hydratedInfo.base, coin2: hydratedInfo.quote } })
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

function FarmStakeLpDialog() {
  const connected = useWallet((s) => s.connected)
  const balances = useWallet((s) => s.balances)
  const tokenAccounts = useWallet((s) => s.tokenAccounts)

  const stakeDialogFarmInfo = useFarms((s) => s.stakeDialogInfo)
  const isStakeDialogOpen = useFarms((s) => s.isStakeDialogOpen)
  const stakeDialogMode = useFarms((s) => s.stakeDialogMode)

  const [amount, setAmount] = useState<string>()

  const userHasLp = useMemo(
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
        return useFarms.setState({ isStakeDialogOpen: false, stakeDialogInfo: undefined })
      }}
      placement="from-bottom"
    >
      {({ close }) => (
        <Card
          className="shadow-xl backdrop-filter backdrop-blur-xl p-8 w-[min(468px,100vw)] mobile:w-full border-1.5 border-[rgba(171,196,255,0.2)]"
          size="lg"
          style={{
            background:
              'linear-gradient(140.14deg, rgba(0, 182, 191, 0.15) 0%, rgba(27, 22, 89, 0.1) 86.61%), linear-gradient(321.82deg, #18134D 0%, #1B1659 100%)',
            boxShadow: '0px 8px 48px rgba(171, 196, 255, 0.12)'
          }}
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
            forceBalanceDepositMode={stakeDialogMode === 'withdraw'}
            forceBalance={stakeDialogFarmInfo?.userStakedLpAmount}
            onEnter={(input) => {
              if (!input) return
              buttonComponentRef.current?.click?.()
            }}
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
                  should: userHasLp,
                  fallbackProps: { children: stakeDialogMode === 'withdraw' ? 'No Unstakable LP' : 'No Stakable LP' }
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
  const isStable = isFarmJsonInfo(info) ? false : info.isStablePool

  if (isFarmJsonInfo(info)) {
    const lpToken = getLpToken(info.lpMint)
    const name = lpToken ? `${lpToken.base.symbol ?? '--'} - ${lpToken.quote.symbol ?? '--'}` : '--' // TODO: rule of get farm name should be a issolate function
    return (
      <AutoBox
        is={isMobile ? 'Col' : 'Row'}
        className={twMerge('flex-wrap items-center mobile:items-start', className)}
      >
        {
          <CoinAvatarPair
            className="justify-self-center mr-2"
            size={isMobile ? 'sm' : 'md'}
            token1={lpToken?.base}
            token2={lpToken?.quote}
          />
        }
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
      className={twMerge('flex-wrap items-center mobile:items-start gap-x-2', className)}
    >
      <CoinAvatarPair className="justify-self-center mr-2" size={isMobile ? 'sm' : 'md'} token1={base} token2={quote} />
      <div className="mobile:text-xs font-medium mobile:mt-px mr-1.5">{name}</div>
      {isStable && <Badge>Stable</Badge>}
      {info.isNewPool && <Badge cssColor="#00d1ff">New</Badge>}
      {info.isUpcomingPool && <Badge cssColor="#5dadee">Upcoming</Badge>}
      {info.isDualFusionPool && <Badge cssColor="#DA2EEF">Dual Yield</Badge>}
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
