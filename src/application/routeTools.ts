import router from 'next/router'

import { ParsedUrlQuery } from 'querystring'

import { objectShakeFalsy } from '@/functions/objectMethods'
import { shrinkToValue } from '@/functions/shrinkToValue'
import { HexAddress, MayFunction } from '@/types/constants'

import useAppSettings from './appSettings/useAppSettings'
import useLiquidity from './liquidity/useLiquidity'
import { useSwap } from './swap/useSwap'
import { SplToken } from './token/type'
import useFarms from './farms/useFarms'
import useIdo from './ido/useIdo'
import useCreateFarms from './createFarm/useCreateFarm'
import { HydratedFarmInfo } from './farms/type'
import parseDuration from '@/functions/date/parseDuration'
import { shakeUndifindedItem } from '@/functions/arrayMethods'
import { toHumanReadable } from '@/functions/format/toHumanReadable'
import { parsedApiFarmInfo } from './createFarm/parsedApiFarmInfoToUIRewardsInfo'

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
    }
  }
  '/pools': {
    queryProps?: any
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
}

export type PageRouteName = keyof PageRouteConfigs

// TODO: parse url query function (can have prevState of zustand store)
export function routeTo<ToPage extends keyof PageRouteConfigs>(
  toPage: ToPage,
  opts?: MayFunction<PageRouteConfigs[ToPage], [{ currentPageQuery: ParsedUrlQuery }]>
): void {
  const options = shrinkToValue(opts, [{ currentPageQuery: router.query }])
  if (toPage === '/swap') {
    const coin1 =
      options?.queryProps?.coin1 ??
      (router.pathname.includes('/liquidity/add') ? useLiquidity.getState().coin1 : undefined)
    const coin2 =
      options?.queryProps?.coin2 ??
      (router.pathname.includes('/liquidity/add') ? useLiquidity.getState().coin2 : undefined)
    const isSwapDirectionReversed = useSwap.getState().directionReversed
    router.push({ pathname: '/swap' }).then(() => {
      const targetState = objectShakeFalsy(isSwapDirectionReversed ? { coin2: coin1, coin1: coin2 } : { coin1, coin2 })
      useSwap.setState(targetState)
    })
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
    router.push({ pathname: '/liquidity/add' }).then(() => {
      /** jump to target page */
      useLiquidity.setState(
        objectShakeFalsy({
          coin1: upCoin,
          coin2: downCoin,
          ammId,
          isRemoveDialogOpen: mode === 'removeLiquidity'
        })
      )
    })
  } else if (toPage === '/farms') {
    router.push({ pathname: '/farms' }).then(() => {
      /** jump to target page */
      useFarms.setState(
        objectShakeFalsy({
          searchText: options?.queryProps?.searchText
        })
      )
    })
  } else if (toPage === '/acceleraytor/detail') {
    router
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
  } else if (toPage === '/farms/edit') {
    const farmInfo = (options!.queryProps as PageRouteConfigs['/farms/edit']['queryProps']).farmInfo
    router
      .push({
        pathname: '/farms/edit',
        query: {
          farmId: farmInfo?.id.toBase58()
        }
      })
      .then(() => {
        const { isCreator, poolId, uiRewardsInfos } = parsedApiFarmInfo(farmInfo)
        useCreateFarms.setState({ poolId, rewards: uiRewardsInfos, cannotAddNewReward: !isCreator })
      })
  } else {
    router.push({ pathname: toPage, query: options?.queryProps })
  }
  return
}
