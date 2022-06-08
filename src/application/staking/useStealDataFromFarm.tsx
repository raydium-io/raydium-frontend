import { useEffect } from 'react'

import useFarms from '@/application/farms/useFarms'

import useStaking from './useStaking'

export default function useStealDataFromFarm() {
  const hydratedFarmInfos = useFarms((s) => s.hydratedInfos)
  useEffect(() => {
    useStaking.setState({ stakeDialogInfo: hydratedFarmInfos.find((info) => info.isStakePool) })
  }, [hydratedFarmInfos])
}
