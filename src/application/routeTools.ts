import router from 'next/router'

import { ParsedUrlQuery } from 'querystring'

import { objectShakeFalsy, objectShakeNil } from '@/functions/objectMethods'
import { shrinkToValue } from '@/functions/shrinkToValue'
import { HexAddress, MayFunction } from '@/types/constants'

import useLiquidity from './liquidity/useLiquidity'
import { useSwap } from './swap/useSwap'
import { SplToken } from './token/type'
import useFarms from './farms/useFarms'
import useIdo from './ido/useIdo'
import useCreateFarms from './createFarm/useCreateFarm'
import { HydratedFarmInfo } from './farms/type'
import toPubString from '@/functions/format/toMintString'
import useWallet from './wallet/useWallet'
import { isMintEqual } from '@/functions/judgers/areEqual'
import { createNewUIRewardInfo, parsedHydratedRewardInfoToUiRewardInfo } from './createFarm/parseRewardInfo'
import CreateFarmPage from '@/pages/farms/create'

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
  '/farms/editReview': {
    queryProps?: any
  }
}

export type PageRouteName = keyof PageRouteConfigs

// TODO: parse url query function (can have prevState of zustand store)
export function routeTo<ToPage extends keyof PageRouteConfigs>(
  toPage: ToPage,
  opts?: MayFunction<PageRouteConfigs[ToPage], [{ currentPageQuery: ParsedUrlQuery }]>
) {
  const options = shrinkToValue(opts, [{ currentPageQuery: router.query }])
  if (toPage === '/swap') {
    const coin1 =
      options?.queryProps?.coin1 ??
      (router.pathname.includes('/liquidity/add') ? useLiquidity.getState().coin1 : undefined)
    const coin2 =
      options?.queryProps?.coin2 ??
      (router.pathname.includes('/liquidity/add') ? useLiquidity.getState().coin2 : undefined)
    const isSwapDirectionReversed = useSwap.getState().directionReversed
    return router.push({ pathname: '/swap' }).then(() => {
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
    return router.push({ pathname: '/liquidity/add' }).then(() => {
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
    return router.push({ pathname: '/farms' }).then(() => {
      /** jump to target page */
      useFarms.setState(
        objectShakeFalsy({
          searchText: options?.queryProps?.searchText
        })
      )
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
    return router
      .push({
        pathname: '/farms/create'
      })
      .then(() => {
        useCreateFarms.setState({
          rewards: [{ ...createNewUIRewardInfo() }]
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
  } else {
    return router.push({ pathname: toPage, query: options?.queryProps })
  }
  return
}

export const routeBack = () => router.back()
