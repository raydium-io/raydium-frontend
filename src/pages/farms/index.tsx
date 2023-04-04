import { Fragment, ReactNode, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'

import { PublicKeyish, TokenAmount } from '@raydium-io/raydium-sdk'

import { twMerge } from 'tailwind-merge'

import useAppAdvancedSettings from '@/application/common/useAppAdvancedSettings'
import useAppSettings from '@/application/common/useAppSettings'
import useConnection from '@/application/connection/useConnection'
import useCreateFarms from '@/application/createFarm/useCreateFarm'
import { isHydratedFarmInfo, isJsonFarmInfo } from '@/application/farms/judgeFarmInfo'
import txFarmDeposit from '@/application/farms/txFarmDeposit'
import txFarmHarvest from '@/application/farms/txFarmHarvest'
import txFarmHarvestAll from '@/application/farms/txFarmHarvestAll'
import txFarmWithdraw from '@/application/farms/txFarmWithdraw'
import { FarmPoolJsonInfo, HydratedFarmInfo, HydratedRewardInfo } from '@/application/farms/type'
import useFarmResetSelfCreatedByOwner from '@/application/farms/useFarmResetSelfCreatedByOwner'
import useFarms, { useFarmFavoriteIds } from '@/application/farms/useFarms'
import { useFarmUrlParser } from '@/application/farms/useFarmUrlParser'
import useLiquidity from '@/application/liquidity/useLiquidity'
import useNotification from '@/application/notification/useNotification'
import { usePools } from '@/application/pools/usePools'
import { routeTo } from '@/application/routeTools'
import useToken from '@/application/token/useToken'
import { RAYMint } from '@/application/token/wellknownToken.config'
import useWallet from '@/application/wallet/useWallet'
import { AddressItem } from '@/components/AddressItem'
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
import LinkExplorer from '@/components/LinkExplorer'
import List from '@/components/List'
import LoadingCircle from '@/components/LoadingCircle'
import LoadingCircleSmall from '@/components/LoadingCircleSmall'
import { OpenBookTip } from '@/components/OpenBookTip'
import PageLayout from '@/components/PageLayout'
import Popover from '@/components/Popover'
import RefreshCircle from '@/components/RefreshCircle'
import ResponsiveDialogDrawer from '@/components/ResponsiveDialogDrawer'
import Row from '@/components/Row'
import Select from '@/components/Select'
import Switcher from '@/components/Switcher'
import Tabs from '@/components/Tabs'
import Tooltip, { TooltipHandle } from '@/components/Tooltip'
import { addItem, removeItem, shakeFalsyItem, shakeUndifindedItem } from '@/functions/arrayMethods'
import { toUTC } from '@/functions/date/dateFormat'
import { getCountDownTime } from '@/functions/date/parseDuration'
import copyToClipboard from '@/functions/dom/copyToClipboard'
import { getURLQueryEntry } from '@/functions/dom/getURLQueryEntries'
import { autoSuffixNumberish } from '@/functions/format/autoSuffixNumberish'
import formatNumber from '@/functions/format/formatNumber'
import toPubString from '@/functions/format/toMintString'
import toPercentString from '@/functions/format/toPercentString'
import { toTokenAmount } from '@/functions/format/toTokenAmount'
import toTotalPrice from '@/functions/format/toTotalPrice'
import toUsdVolume from '@/functions/format/toUsdVolume'
import { isMintEqual, isPubEqual } from '@/functions/judgers/areEqual'
import { isTokenAmount } from '@/functions/judgers/dateType'
import { gt, gte, isMeaningfulNumber } from '@/functions/numberish/compare'
import { div } from '@/functions/numberish/operations'
import { toString } from '@/functions/numberish/toString'
import { searchItems } from '@/functions/searchItems'
import { toggleSetItem } from '@/functions/setMethods'
import useOnceEffect from '@/hooks/useOnceEffect'
import useSort from '@/hooks/useSort'
import { NewCompensationBanner } from '../pools'
import { shouldLiquidityOrFarmBeenMigrate } from '@/application/concentrated/shouldLiquidityOrFarmBeenMigrate'
import useConcentrated from '@/application/concentrated/useConcentrated'
import ConcentratedMigrateDialog from '@/pageComponents/dialogs/ConcentratedMigrateDialog'

export default function FarmsPage() {
  const query = getURLQueryEntry()
  useFarmUrlParser()
  useFarmResetSelfCreatedByOwner()
  const currentTab = useFarms((s) => s.currentTab)

  useEffect(() => {
    useFarms.setState({ currentTab: query.tab as 'Raydium' | 'Fusion' | 'Ecosystem' | 'Staked' })
  }, [query])

  return (
    <PageLayout
      mobileBarTitle={{
        items: [
          { value: 'Raydium', barLabel: 'Raydium Farm' },
          { value: 'Fusion', barLabel: 'Fusion Farm' },
          { value: 'Ecosystem', barLabel: 'Ecosystem Farm' },
          { value: 'Staked', barLabel: 'Staked Farm' }
        ],
        currentValue: currentTab,
        onChange: (value) => useFarms.setState({ currentTab: value as 'Raydium' | 'Fusion' | 'Ecosystem' | 'Staked' }),
        urlSearchQueryKey: 'tab',
        drawerTitle: 'FARMS'
      }}
      contentButtonPaddingShorter
      metaTitle="Farms - Raydium"
      contentBanner={<NewCompensationBanner />}
    >
      <FarmHeader />
      <FarmCard />
    </PageLayout>
  )
}

function FarmHeader() {
  const isMobile = useAppSettings((s) => s.isMobile)
  return isMobile ? null : (
    <Col>
      <Grid className="grid-cols-3 justify-between items-center pb-8 pt-0">
        <div className="text-2xl font-semibold justify-self-start text-white">Farms</div>
        <FarmTabBlock />
        <FarmCreateFarmEntryBlock />
      </Grid>
    </Col>
  )
}

/** only mobile */
function ToolsButton({
  className,
  dataSource
}: {
  className?: string
  dataSource: (FarmPoolJsonInfo | HydratedFarmInfo)[]
}) {
  const currentTab = useFarms((s) => s.currentTab)
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
                <FarmTimeBasisSelector />
                {/* {currentTab === 'Ecosystem' && <FarmRewardTokenTypeSelector />} */}
                <FarmCreateFarmEntryBlock />
                <FarmHarvestAllButton
                  infos={
                    dataSource.filter(
                      (i) => isHydratedFarmInfo(i) && isMeaningfulNumber(i.ledger?.deposited)
                    ) as HydratedFarmInfo[]
                  }
                />
              </Grid>
            </Card>
          </div>
        </Popover.Panel>
      </Popover>
    </>
  )
}
function FarmHarvestAllButton({ infos }: { infos: HydratedFarmInfo[] }) {
  const isApprovePanelShown = useAppSettings((s) => s.isApprovePanelShown)
  const walletConnected = useWallet((s) => s.connected)
  const isMobile = useAppSettings((s) => s.isMobile)
  const canHarvestAll = useMemo(() => Boolean(infos.length), [infos])
  return (
    <Button
      className="frosted-glass-teal"
      isLoading={isApprovePanelShown}
      validators={[{ should: walletConnected }, { should: canHarvestAll }]}
      onClick={() => {
        txFarmHarvestAll({ infos })
      }}
      size={isMobile ? 'xs' : 'sm'}
    >
      Harvest all
    </Button>
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
        'px-2 py-2 mobile:py-1 gap-2 ring-inset ring-1 ring-[rgba(196,214,255,0.5)] rounded-xl mobile:rounded-lg pc:w-[12vw] mobile:w-auto',
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
  const currentTab = useFarms((s) => s.currentTab)
  if (!connected) return null
  if (currentTab === 'Staked') return null // no staked switcher if it is staked
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

function FarmSelfCreatedOnlyBlock({ className }: { className?: string }) {
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
  return (
    <Row
      className={twMerge(
        `justify-self-end mobile:justify-self-auto gap-1 py-1 flex-wrap items-center opacity-100 pointer-events-auto clickable transition`,
        className
      )}
      onClick={() => {
        routeTo('/farms/create')
      }}
    >
      <Icon heroIconName="plus-circle" className="text-[#abc4ff] mobile:text-[#abc4ff80]" size="sm" />
      <span className="text-[#abc4ff] mobile:text-[#abc4ff80] font-medium text-sm mobile:text-xs">Create Farm</span>
    </Row>
  )
}

function FarmTabBlock({ className }: { className?: string }) {
  const currentTab = useFarms((s) => s.currentTab)
  const isMobile = useAppSettings((s) => s.isMobile)
  return isMobile ? (
    <Tabs
      currentValue={currentTab}
      urlSearchQueryKey="tab"
      values={shakeFalsyItem(['Raydium', 'Fusion', 'Ecosystem', 'Staked'] as const)}
      onChange={(tab) => useFarms.setState({ currentTab: tab })}
      className={className}
    />
  ) : (
    <Tabs
      currentValue={currentTab}
      urlSearchQueryKey="tab"
      values={shakeFalsyItem(['Raydium', 'Fusion', 'Ecosystem', 'Staked'] as const)}
      onChange={(tab) => useFarms.setState({ currentTab: tab })}
      className={twMerge('justify-self-center mobile:col-span-full', className)}
    />
  )
}

function FarmTimeBasisSelector({ className }: { className?: string }) {
  const timeBasis = useFarms((s) => s.timeBasis)
  return (
    <Select
      className={twMerge('z-20', className)}
      candidateValues={['24H', '7D', '30D']}
      localStorageKey="ui-time-basis"
      defaultValue={timeBasis}
      prefix="Time Basis:"
      onChange={(newSortKey) => {
        useFarms.setState({ timeBasis: newSortKey ?? timeBasis })
      }}
    />
  )
}

function FarmRewardTokenTypeSelector({ className }: { className?: string }) {
  const tokenType = useFarms((s) => s.tokenType)
  return (
    <Select
      className={twMerge('z-20', className)}
      candidateValues={['All', 'Standard SPL', 'Option tokens']}
      localStorageKey="farm-reward-token-type"
      defaultValue={tokenType}
      prefix="Token Type:"
      onChange={(newSortKey) => {
        useFarms.setState({ tokenType: newSortKey ?? tokenType })
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
  const tokenType = useFarms((s) => s.tokenType)
  const onlySelfCreatedFarms = useFarms((s) => s.onlySelfCreatedFarms)
  const searchText = useFarms((s) => s.searchText)
  const [favouriteIds] = useFarmFavoriteIds()
  const isMobile = useAppSettings((s) => s.isMobile)
  const owner = useWallet((s) => s.owner)
  const isLoading = useFarms((s) => s.isLoading)
  const timeBasis = useFarms((s) => s.timeBasis)
  const dataSource = (
    (hydratedInfos.length ? hydratedInfos : jsonInfos) as (FarmPoolJsonInfo | HydratedFarmInfo)[]
  ).filter((i) => !isMintEqual(i.lpMint, RAYMint)) // exclude special staked pool

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
          /* no user meaninglessinactive farm*/
          isHydratedFarmInfo(i)
            ? !i.isClosedPool || isMintEqual(i.creator, owner) || isMeaningfulNumber(i.ledger?.deposited)
            : true
        )
        .filter((i) =>
          onlySelfFarms && isHydratedFarmInfo(i) ? i.ledger && isMeaningfulNumber(i.ledger.deposited) : true
        ) // Switch
        .filter((i) => (onlySelfCreatedFarms && owner ? isMintEqual(i.creator, owner) && i.version === 6 : true)) // Switch
        .filter((i) =>
          i.version === 6 && isHydratedFarmInfo(i)
            ? tokenType === 'Option tokens'
              ? i.rewards.some((r) => r.isOptionToken)
              : tokenType === 'Standard SPL'
              ? !i.rewards.some((r) => r.isOptionToken)
              : true
            : true
        ), // token type (for option token)
    [onlySelfFarms, searchText, onlySelfCreatedFarms, tabedDataSource, owner]
  )

  const applySearchedDataSource = useDeferredValue(
    useMemo(
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
                  i.quote?.symbol,
                  { text: toPubString(i.lpMint), entirely: true }
                  // { text: toSentenceCase(i.base?.name ?? '').split(' '), entirely: true },
                  // { text: toSentenceCase(i.quote?.name ?? '').split(' '), entirely: true }
                ]
              : [
                  { text: toPubString(i.id), entirely: true },
                  { text: toPubString(i.lpMint), entirely: true }
                ]
        }),
      [applyFiltersDataSource, searchText]
    )
  )

  const {
    sortedData,
    setConfig: setSortConfig,
    sortConfig,
    clearSortConfig
  } = useSort(applySearchedDataSource, {
    defaultSort: {
      key: 'defaultKey',
      sortCompare: [(i) => favouriteIds?.includes(toPubString(i.id))]
    }
  })
  // re-sort when favourite have loaded
  useOnceEffect(
    ({ runed }) => {
      if (favouriteIds !== undefined) runed()
      if (favouriteIds != null) {
        setSortConfig({
          key: 'init',
          sortCompare: [(i) => favouriteIds?.includes(toPubString(i.id))],
          mode: 'decrease'
        })
      }
    },
    [favouriteIds]
  )
  // re-sort when currentTab have changed
  useEffect(() => {
    setSortConfig({
      key: 'init by currentTab',
      sortCompare: [(i) => favouriteIds?.includes(toPubString(i.id))],
      mode: 'decrease'
    })
  }, [currentTab])

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
        <Grid className="grow gap-2 grid-cols-auto-fit">
          <FarmSearchBlock />
          <FarmTableSorterBlock
            onChange={(newSortKey) => {
              newSortKey
                ? setSortConfig({
                    key: newSortKey,
                    sortCompare:
                      newSortKey === 'favorite'
                        ? (i) => favouriteIds?.includes(toPubString(i.id))
                        : (i) => i[newSortKey]
                  })
                : clearSortConfig()
            }}
          />
        </Grid>
        <ToolsButton className="self-center" dataSource={dataSource} />
      </Row>
    </div>
  ) : (
    <Row className="justify-between gap-16 gap-y-4 items-center mb-4">
      <div>
        <Row className="items-center">
          <div className="font-medium text-white text-lg">{farmCardTitleInfo.title}</div>
          {farmCardTitleInfo.tooltip && (
            <Tooltip>
              <Icon className="ml-1 cursor-help" size="sm" heroIconName="question-mark-circle" />
              <Tooltip.Panel className="max-w-[300px]">{farmCardTitleInfo.tooltip}</Tooltip.Panel>
            </Tooltip>
          )}
        </Row>
        <div className="font-medium text-[rgba(196,214,255,.5)] text-base ">{farmCardTitleInfo.description}</div>
      </div>
      <Row className="grow flex-wrap justify-end items-stretch gap-6">
        {Boolean(owner) && (currentTab === 'Ecosystem' || currentTab === 'Staked') ? (
          <FarmSelfCreatedOnlyBlock />
        ) : null}
        <FarmHarvestAllButton
          infos={
            dataSource.filter(
              (i) => isHydratedFarmInfo(i) && isMeaningfulNumber(i.ledger?.deposited)
            ) as HydratedFarmInfo[]
          }
        />
        {/* <FarmStakedOnlyBlock /> */}
        {/* {currentTab === 'Ecosystem' && <FarmRewardTokenTypeSelector />} */}
        <FarmTimeBasisSelector />
        <FarmSearchBlock />
      </Row>
    </Row>
  )

  return (
    <CyberpunkStyleCard
      haveMinHeight
      wrapperClassName="flex-1 overflow-hidden flex flex-col"
      className="grow p-10 pt-6 pb-4 mobile:px-3 mobile:py-3 w-full flex flex-col h-full"
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
              <Icon className="ml-1 cursor-help" size="sm" heroIconName="question-mark-circle" />
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
  const isMigrateToClmmDialogOpen = useConcentrated((s) => s.isMigrateToClmmDialogOpen)
  const [favouriteIds, setFavouriteIds] = useFarmFavoriteIds()

  // just for clmm migrate dialog prop, the dialog prop style is not the same as lp unstake dialog, so unstake dialog's design is wrong. But can't change this component now.
  const currentDialogInfo = useFarms((s) => s.currentDialogInfo)
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
                  {({ isOpen }) => (
                    <FarmCardDatabaseBodyCollapseItemFace
                      open={isOpen}
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
                  {isLoading ? null : <FarmCardDatabaseBodyCollapseItemContent farmInfo={info} />}
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
      {currentDialogInfo && (
        <ConcentratedMigrateDialog
          info={currentDialogInfo}
          open={isMigrateToClmmDialogOpen}
          onClose={() => useConcentrated.setState({ isMigrateToClmmDialogOpen: false })}
        />
      )}
    </>
  )
}

// currently only SDKRewardInfo
function FarmPendingRewardBadge({
  farmInfo,
  reward
}: {
  farmInfo: HydratedFarmInfo
  reward: HydratedRewardInfo | TokenAmount | undefined
}) {
  const tokenListSettings = useToken((s) => s.tokenListSettings)
  const unnamedTokenMints = tokenListSettings['UnNamed Token List'].mints

  if (!reward) return null
  const isRewarding = isTokenAmount(reward) ? true : reward.isRewarding
  const isRewardEnded = isTokenAmount(reward) ? false : reward.isRewardEnded
  const isRewardBeforeStart = isTokenAmount(reward) ? false : reward.isRewardBeforeStart
  const pendingAmount = isTokenAmount(reward) ? reward : reward.userPendingReward
  return (
    <Tooltip placement="bottom">
      <Row
        className={`ring-1 ring-inset ${
          isTokenAmount(reward) ? 'ring-[#abc4ff80]' : reward.isOptionToken ? 'ring-[#DA2EEF]' : 'ring-[#abc4ff80]'
        } p-1 rounded-full items-center gap-2 overflow-hidden ${
          isRewarding ? '' : isRewardEnded ? 'opacity-30 contrast-40' : 'opacity-50'
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
        {(reward as HydratedRewardInfo).openTime && isRewardBeforeStart && (
          <div className="opacity-50">Start in {getCountDownTime((reward as HydratedRewardInfo).openTime)}</div>
        )}
        {!isTokenAmount(reward) && reward.openTime && reward.endTime && (
          <div className="opacity-50">
            {toUTC(reward.openTime, { hideHourMinuteSecond: true })} ~{' '}
            {toUTC(reward.endTime, { hideHourMinuteSecond: true })}
          </div>
        )}
        {reward.token?.mint && (
          <AddressItem
            showDigitCount={6}
            addressType="token"
            canCopy
            canExternalLink
            textClassName="text-xs"
            className="w-full opacity-50 mt-2 contrast-75"
          >
            {toPubString(reward.token.mint)}
          </AddressItem>
        )}

        {unnamedTokenMints?.has(toPubString(reward.token?.mint)) && (
          <div className="max-w-[220px] mt-2">
            This token does not currently have a ticker symbol. Check to ensure it is the token you want to interact
            with.
          </div>
        )}
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
  const aprInfos = useFarms((s) => s.jsonFarmAprInfos)
  const targetAprInfo = aprInfos.find((i) => i.id === toPubString(info.id))
  const isMobile = useAppSettings((s) => s.isMobile)
  const timeBasis = useFarms((s) => s.timeBasis)
  const haveOptionToken = !isJsonFarmInfo(info) && info.rewards.some((reward) => reward.isOptionToken)
  // time-based
  const timeBasedTotalApr = isJsonFarmInfo(info)
    ? undefined
    : info[timeBasis === '24H' ? 'totalApr24h' : timeBasis === '30D' ? 'totalApr30d' : 'totalApr7d']
  const timeBasedRaydiumFeeApr = isJsonFarmInfo(info)
    ? undefined
    : info[timeBasis === '24H' ? 'raydiumFeeApr24h' : timeBasis === '30D' ? 'raydiumFeeApr30d' : 'raydiumFeeApr7d']

  const chainTimeOffset = useConnection((s) => s.chainTimeOffset)
  const rewardType = (itemReward: HydratedRewardInfo) => {
    const chainTime = Date.now() + (chainTimeOffset ?? 0)
    if ((itemReward.endTime ?? new Date()).getTime() < chainTime) return 1
    if ((itemReward.openTime ?? new Date()).getTime() > chainTime) return -1
    return 0
  }

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
          loading={isJsonFarmInfo(info) || !info.rewards}
          value={
            <Row className="flex-wrap items-center gap-2 w-full pr-8">
              {isJsonFarmInfo(info) ? (
                '--'
              ) : (
                <>
                  {info.rewards
                    .sort((a, b) => rewardType(a) - rewardType(b))
                    .map((reward) => (
                      <Fragment key={toPubString(reward.rewardVault)}>
                        <FarmPendingRewardBadge farmInfo={info} reward={reward} />
                      </Fragment>
                    ))}
                  {haveOptionToken && (
                    <Tooltip>
                      <Badge cssColor="#DA2EEF">Option tokens</Badge>
                      <Tooltip.Panel>
                        Reward token is an option, check token metadata and with token project on how to redeem. APR may
                        be inaccurate.
                      </Tooltip.Panel>
                    </Tooltip>
                  )}
                </>
              )}
            </Row>
          }
        />
      ) : (
        <TextInfoItem
          name="Pending Rewards"
          loading={isJsonFarmInfo(info) || !info.rewards}
          value={
            <Row className="flex-wrap gap-2 w-full pr-8">
              {isJsonFarmInfo(info)
                ? '--'
                : info.rewards.map(
                    ({ token, userPendingReward, userHavedReward }) =>
                      userHavedReward &&
                      token && (
                        <div key={toPubString(token?.mint)}>
                          <FarmPendingRewardBadge
                            farmInfo={info}
                            reward={userPendingReward ?? toTokenAmount(token, 0)}
                          />
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
        loading={isJsonFarmInfo(info) || !timeBasedTotalApr}
        value={
          isJsonFarmInfo(info) ? (
            '--'
          ) : (
            <Row className="items-center">
              <Tooltip placement="right">
                {timeBasedTotalApr ? toPercentString(timeBasedTotalApr) : '--'}
                <Tooltip.Panel>
                  {timeBasedRaydiumFeeApr && (
                    <div className="whitespace-nowrap">Fees {toPercentString(timeBasedRaydiumFeeApr)}</div>
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
              {haveOptionToken && (
                <Tooltip placement="right">
                  <Icon className="ml-1 cursor-help" size="sm" heroIconName="question-mark-circle" />
                  <Tooltip.Panel>
                    <div className="max-w-[300px]">
                      Options APR is an estimate and varies based on token market price and expected strike price.
                    </div>
                  </Tooltip.Panel>
                </Tooltip>
              )}
            </Row>
          )
        }
      />
      <TextInfoItem
        name="TVL"
        value={
          isHydratedFarmInfo(info) && info.tvl
            ? `~${toUsdVolume(info.tvl, { decimalPlace: 0 })}`
            : targetAprInfo
            ? `~${toUsdVolume(targetAprInfo.tvl, { decimalPlace: 0 })}`
            : '--'
        }
        subValue={
          isHydratedFarmInfo(info) && info.stakedLpAmount
            ? `${formatNumber(toString(info.stakedLpAmount, { decimalLength: 0 }))} LP`
            : targetAprInfo
            ? `${formatNumber(div(targetAprInfo.tvl, targetAprInfo.lpPrice), { fractionLength: 0 })} LP`
            : '--'
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
                ? `≈${toUsdVolume(info.tvl, { autoSuffix: true, decimalPlace: 1 })}`
                : '--'
            }
            subValue={
              isJsonFarmInfo(info)
                ? '--'
                : info.stakedLpAmount && `${autoSuffixNumberish(info.stakedLpAmount, { decimalPlace: 1 })} LP`
            }
          />

          <TextInfoItem
            name={`APR(${timeBasis})`}
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

function FarmCardDatabaseBodyCollapseItemContent({ farmInfo }: { farmInfo: HydratedFarmInfo | FarmPoolJsonInfo }) {
  const lpPrices = usePools((s) => s.lpPrices)
  const prices = useToken((s) => s.tokenPrices)
  const isMobile = useAppSettings((s) => s.isMobile)
  const lightBoardClass = 'bg-[rgba(20,16,65,.2)]'
  const connected = useWallet((s) => s.connected)
  const owner = useWallet((s) => s.owner)
  const balances = useWallet((s) => s.balances)
  const hasLp = isMeaningfulNumber(balances[toPubString(farmInfo.lpMint)])
  const hasPendingReward =
    isHydratedFarmInfo(farmInfo) &&
    farmInfo.rewards.some(({ userPendingReward }) => isMeaningfulNumber(userPendingReward))
  const logSuccess = useNotification((s) => s.logSuccess)
  const isApprovePanelShown = useAppSettings((s) => s.isApprovePanelShown)
  const canMigrate = shouldLiquidityOrFarmBeenMigrate(farmInfo)

  if (isJsonFarmInfo(farmInfo)) return null
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
                          onClick: () => routeTo('/liquidity/add', { queryProps: { ammId: farmInfo.ammId } })
                        }
                      }
                    ]}
                    onClick={() => {
                      if (connected) {
                        useFarms.setState({
                          isStakeDialogOpen: true,
                          stakeDialogMode: 'deposit',
                          currentDialogInfo: farmInfo
                        })
                      } else {
                        useAppSettings.setState({ isWalletSelectorShown: true })
                      }
                    }}
                  >
                    Stake
                  </Button>
                  {canMigrate && (
                    <Button
                      className="text-base mobile:text-sm font-medium frosted-glass frosted-glass-teal rounded-xl flex-grow"
                      onClick={() => {
                        // TODO: load data here
                        useConcentrated.setState({
                          isMigrateToClmmDialogOpen: true
                        })
                        useFarms.setState({
                          currentDialogInfo: farmInfo
                        })
                      }}
                    >
                      Migrate
                    </Button>
                  )}
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
                            currentDialogInfo: farmInfo
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
                        onClick: () => routeTo('/liquidity/add', { queryProps: { ammId: farmInfo.ammId } })
                      }
                    }
                  ]}
                  onClick={() => {
                    useFarms.setState({
                      isStakeDialogOpen: true,
                      stakeDialogMode: 'deposit',
                      currentDialogInfo: farmInfo
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
            <div className="flex-grow w-full">
              <div
                className={`text-[rgba(171,196,255,0.5)] font-medium text-sm mobile:text-2xs ${
                  farmInfo.rewards.length > 2 ? 'mb-5' : 'mb-1'
                }`}
              >
                Pending rewards
              </div>
              <Grid
                className={`gap-board
                   ${
                     farmInfo.rewards.filter((i) => i.version === 6 || i.userHavedReward).length > 1
                       ? 'grid-cols-2'
                       : 'grid-cols-1'
                   }`}
                style={{
                  clipPath: 'inset(17px)', // 1px for gap-board
                  margin: '-17px'
                }}
              >
                {shakeUndifindedItem(
                  farmInfo.rewards.map((reward, idx) =>
                    farmInfo.version === 6 || reward.userHavedReward ? (
                      <div key={idx} className="p-4">
                        <div className={`text-white font-medium text-base mobile:text-xs`}>
                          {reward.userPendingReward ? toString(reward.userPendingReward) : 0} {reward.token?.symbol}
                        </div>
                        <div className="text-[rgba(171,196,255,0.5)] font-medium text-sm mobile:text-xs">
                          {prices?.[String(reward.token?.mint)] && reward?.userPendingReward
                            ? toUsdVolume(toTotalPrice(reward.userPendingReward, prices[String(reward.token?.mint)]))
                            : null}
                        </div>
                      </div>
                    ) : undefined
                  )
                )}
              </Grid>
            </div>
            <Button
              // disable={Number(info.pendingReward?.numerator) <= 0}
              className="frosted-glass-teal rounded-xl mobile:w-full mobile:py-2 mobile:text-xs whitespace-nowrap"
              isLoading={isApprovePanelShown}
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
            size={isMobile ? 'sm' : 'md'}
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

  const stakeDialogFarmInfo = useFarms((s) => s.currentDialogInfo)
  const isStakeDialogOpen = useFarms((s) => s.isStakeDialogOpen)
  const stakeDialogMode = useFarms((s) => s.stakeDialogMode)

  const [amount, setAmount] = useState<string>()

  const isApprovePanelShown = useAppSettings((s) => s.isApprovePanelShown)

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

  // for keyboard navigation
  const coinInputBoxComponentRef = useRef<CoinInputBoxHandle>()
  const buttonComponentRef = useRef<ButtonHandle>()

  return (
    <ResponsiveDialogDrawer
      open={isStakeDialogOpen}
      onClose={() => {
        setAmount(undefined)
        useFarms.setState({ isStakeDialogOpen: false, currentDialogInfo: undefined })
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
              isLoading={isApprovePanelShown}
              validators={[
                { should: connected },
                { should: stakeDialogFarmInfo?.lp },
                { should: amount },
                { should: gt(userInputTokenAmount, 0) },
                {
                  should: gte(avaliableTokenAmount, userInputTokenAmount),
                  fallbackProps: { children: 'Insufficient Lp Balance' }
                },
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
            <Button type="text" disabled={isApprovePanelShown} className="text-sm backdrop-filter-none" onClick={close}>
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
  const currentTab = useFarms((s) => s.currentTab)
  const programIds = useAppAdvancedSettings((s) => s.programIds)

  const liquidityJsonInfos = useLiquidity((s) => s.jsonInfos)
  const liquidity = liquidityJsonInfos.find((i) => i.lpMint === info.lpMint)

  if (isJsonFarmInfo(info)) {
    const lpToken = getLpToken(info.lpMint) // TODO: may be token can cache?
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
            <Row className="mobile:text-xs font-medium mobile:mt-px mr-1.5">
              <CoinAvatarInfoItemSymbol mint={info.baseMint} /> - <CoinAvatarInfoItemSymbol mint={info.quoteMint} />
            </Row>
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
      <Row className="mobile:text-xs font-medium mobile:mt-px mr-1.5">
        <CoinAvatarInfoItemSymbol mint={info.baseMint} />-<CoinAvatarInfoItemSymbol mint={info.quoteMint} />
        {currentTab === 'Ecosystem' && (
          <Tooltip>
            <Icon iconClassName="ml-1" size="sm" heroIconName="information-circle" />
            <Tooltip.Panel>
              <div className="max-w-[300px] space-y-1.5">
                {[info?.baseMint, info?.quoteMint].map((token, idx) =>
                  token ? (
                    <Row key={idx} className="gap-2">
                      {getToken(token) && <CoinAvatar size={'xs'} token={getToken(token)} />}
                      <AddressItem
                        className="grow"
                        showDigitCount={5}
                        addressType="token"
                        canCopy
                        canExternalLink
                        textClassName="flex text-xs text-[#abc4ff] justify-start "
                        iconClassName="text-[#abc4ff]"
                      >
                        {toPubString(token)}
                      </AddressItem>
                    </Row>
                  ) : null
                )}
              </div>
            </Tooltip.Panel>
          </Tooltip>
        )}
      </Row>
      {info.isClosedPool && <Badge cssColor="#DA2EEF">Inactive</Badge>}
      {isStable && <Badge>Stable</Badge>}
      {info.isDualFusionPool && info.version !== 6 && <Badge cssColor="#DA2EEF">Dual Yield</Badge>}
      {info.isNewPool && <Badge cssColor="#00d1ff">New</Badge>}
      {info.isUpcomingPool && <Badge cssColor="#5dadee">Upcoming</Badge>}
      {liquidity && isPubEqual(liquidity.marketProgramId, programIds.OPENBOOK_MARKET) && <OpenBookTip></OpenBookTip>}
    </AutoBox>
  )
}
function CoinAvatarInfoItemSymbol({ mint }: { mint: PublicKeyish }) {
  const getToken = useToken((s) => s.getToken)
  const tokenListSettings = useToken((s) => s.tokenListSettings)

  const unnamedTokenMints = tokenListSettings['UnNamed Token List'].mints
  const token = getToken(mint)
  return unnamedTokenMints?.has(toPubString(mint)) ? (
    <Row className="items-center">
      <div>{token?.symbol ?? 'UNKNOWN'}</div>
      <div>
        <Tooltip>
          <Icon className="cursor-help" size="sm" heroIconName="question-mark-circle" />
          <Tooltip.Panel>
            <div className="max-w-[220px]">
              <div>
                This token does not currently have a ticker symbol. Check to ensure it is the token you want to interact
                with.
              </div>

              <Row className="gap-2 mt-4 w-fit mx-auto">
                <AddressItem
                  className="grow"
                  showDigitCount={8}
                  addressType="token"
                  canCopy
                  canExternalLink
                  textClassName="flex text-xs text-[#abc4ff]"
                  iconClassName="text-[#abc4ff]"
                >
                  {toPubString(token?.mint)}
                </AddressItem>
              </Row>
            </div>
          </Tooltip.Panel>
        </Tooltip>
      </div>
    </Row>
  ) : (
    <>{token?.symbol ?? 'UNKNOWN'}</>
  )
}

function TextInfoItem({
  name,
  value,
  subValue,
  className,
  loading = value === '--' || subValue === '--'
}: {
  name: string
  value?: ReactNode
  subValue?: ReactNode
  loading?: boolean
  className?: string
}) {
  const isMobile = useAppSettings((s) => s.isMobile)
  return (
    <Col className={className}>
      {isMobile && <div className=" mb-1 text-[rgba(171,196,255,0.5)] font-medium text-sm mobile:text-2xs">{name}</div>}
      <Col className="flex-grow justify-center">
        {loading ? (
          <LoadingCircleSmall className="w-4 h-4" />
        ) : (
          <>
            <div className="text-base mobile:text-xs">{value || '--'}</div>
            {subValue && <div className="text-sm mobile:text-2xs text-[rgba(171,196,255,0.5)]">{subValue}</div>}
          </>
        )}
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
        <LinkExplorer hrefDetail={`${address}`} type={type}>
          <Icon size="sm" heroIconName="external-link" className="clickable text-[#abc4ff]" />
        </LinkExplorer>
      </Row>
    </Row>
  )
}
