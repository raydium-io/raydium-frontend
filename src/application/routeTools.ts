import router from 'next/router'

import { PublicKey } from '@solana/web3.js'

import { ParsedUrlQuery } from 'querystring'

import { addItem } from '@/functions/arrayMethods'
import { cleanQuery } from '@/functions/dom/getURLQueryEntries'
import toPubString from '@/functions/format/toMintString'
import { isMintEqual } from '@/functions/judgers/areEqual'
import { objectShakeFalsy, objectShakeNil } from '@/functions/objectMethods'
import { shrinkToValue } from '@/functions/shrinkToValue'
import { HexAddress, MayFunction } from '@/types/constants'

import { createNewUIRewardInfo, parsedHydratedRewardInfoToUiRewardInfo } from './createFarm/parseRewardInfo'
import useCreateFarms from './createFarm/useCreateFarm'
import { HydratedFarmInfo } from './farms/type'
import useFarms from './farms/useFarms'
import useIdo from './ido/useIdo'
import useLiquidity from './liquidity/useLiquidity'
import { usePools } from './pools/usePools'
import { useSwap } from './swap/useSwap'
import { SplToken } from './token/type'
import useWallet from './wallet/useWallet'

export type PageRouteConfigs = {
  '/swap': {
    queryProps?: {
      coin1?: SplToken
      coin2?: SplToken
      ammId?: HexAddress
    }
  }
  '/liquidity/add': {
    queryProps?: {
      coin1?: SplToken
      coin2?: SplToken
      ammId?: string
      mode?: 'removeLiquidity'
    }
  }
  '/liquidity/create': {
    queryProps?: any
  }
  '/farms': {
    queryProps?: {
      searchText?: string
      currentTab?: 'Raydium' | 'Fusion' | 'Ecosystem' | 'Staked'
      newExpandedItemId?: string
    }
  }
  '/pools': {
    queryProps?: {
      expandedPoolId?: string
      searchText?: string
    }
  }
  '/staking': {
    queryProps?: any
  }
  '/acceleraytor/list': {
    queryProps?: any
  }
  '/acceleraytor/detail': {
    queryProps?: {
      idoId?: HexAddress
    }
  }
  '/farms/create': {
    queryProps?: any
  }
  '/farms/createReview': {
    queryProps?: any
  }
  '/farms/edit': {
    queryProps: {
      farmInfo: HydratedFarmInfo
    }
  }
  '/farms/editReview': {
    queryProps?: any
  }
}

export type PageRouteName = keyof PageRouteConfigs

let historicalRouterLength = 0

// TODO: parse url query function (can have prevState of zustand store)
export function routeTo<ToPage extends keyof PageRouteConfigs>(
  toPage: ToPage,
  opts?: MayFunction<PageRouteConfigs[ToPage], [{ currentPageQuery: ParsedUrlQuery }]>
) {
  const options = shrinkToValue(opts, [{ currentPageQuery: router.query }])
  historicalRouterLength++
  if (toPage === '/swap') {
    const coin1 =
      options?.queryProps?.coin1 ??
      (router.pathname.includes('/liquidity/add') ? useLiquidity.getState().coin1 : undefined)
    const coin2 =
      options?.queryProps?.coin2 ??
      (router.pathname.includes('/liquidity/add') ? useLiquidity.getState().coin2 : undefined)
    const isSwapDirectionReversed = useSwap.getState().directionReversed
    const targetState = objectShakeFalsy(isSwapDirectionReversed ? { coin2: coin1, coin1: coin2 } : { coin1, coin2 })
    useSwap.setState(targetState)
    router.push({ pathname: '/swap' })
  } else if (toPage === '/liquidity/add') {
    /** get info from queryProp */
    const ammId = options?.queryProps?.ammId
    const coin1 =
      options?.queryProps?.coin1 ?? (router.pathname.includes('swap') ? useSwap.getState().coin1 : undefined)
    const coin2 =
      options?.queryProps?.coin2 ?? (router.pathname.includes('swap') ? useSwap.getState().coin2 : undefined)
    const isSwapDirectionReversed = useSwap.getState().directionReversed
    const upCoin = isSwapDirectionReversed ? coin2 : coin1
    const downCoin = isSwapDirectionReversed ? coin1 : coin2
    const mode = options?.queryProps?.mode
    useLiquidity.setState({
      coin1: upCoin,
      coin2: downCoin,
      ammId,
      isRemoveDialogOpen: mode === 'removeLiquidity'
    })
    router.push({ pathname: '/liquidity/add' })
  } else if (toPage === '/farms') {
    return router.push({ pathname: '/farms' }).then(() => {
      /** jump to target page */
      useFarms.setState((s) =>
        objectShakeFalsy({
          currentTab: options?.queryProps?.currentTab,
          searchText: options?.queryProps?.searchText,
          expandedItemIds: addItem(s.expandedItemIds, options?.queryProps?.newExpandedItemId)
        })
      )
      if (options?.queryProps?.newExpandedItemId) {
        useFarms.setState((s) => ({
          expandedItemIds: addItem(s.expandedItemIds, options.queryProps.newExpandedItemId)
        }))
      }
    })
  } else if (toPage === '/acceleraytor/detail') {
    return router
      .push({
        pathname: '/acceleraytor/detail',
        query: {
          idoId: options?.queryProps?.idoId
        }
      })
      .then(() => {
        /** jump to target page */
        useIdo.setState({
          currentIdoId: options?.queryProps?.idoId
        })
      })
  } else if (toPage === '/farms/create') {
    cleanQuery('farmid')
    // clear zustand createFarm
    useCreateFarms.setState({
      farmId: undefined,
      poolId: undefined,
      rewards: [{ ...createNewUIRewardInfo() }]
    })
    return router
      .push({
        pathname: '/farms/create'
      })
      .then(() => {
        useFarms.setState({
          searchText: ''
        })
      })
  } else if (toPage === '/farms/edit') {
    const farmInfo = (options!.queryProps as PageRouteConfigs['/farms/edit']['queryProps']).farmInfo
    const { owner } = useWallet.getState()
    return router
      .push({
        pathname: '/farms/edit',
        query: {
          farmId: farmInfo?.id.toBase58()
        }
      })
      .then(() => {
        useCreateFarms.setState(
          objectShakeNil({
            farmId: toPubString(farmInfo.id),
            poolId: farmInfo.ammId,
            rewards: farmInfo.rewards.map((reward) => parsedHydratedRewardInfoToUiRewardInfo(reward)),
            disableAddNewReward: !isMintEqual(farmInfo.creator, owner)
          })
        )
      })
  } else if (toPage === '/pools') {
    return router.push({ pathname: '/pools' }).then(() => {
      usePools.setState(
        objectShakeFalsy({
          searchText: options?.queryProps?.searchText,
          expandedPoolId: options?.queryProps?.expandedPoolId
        })
      )
    })
  } else {
    return router.push({ pathname: toPage, query: options?.queryProps })
  }
  return
}

export const routeBack = () => router.back()

export const routeReplace = (url: string) => router.replace(url)

export function getRouterStackLength() {
  return historicalRouterLength
}
