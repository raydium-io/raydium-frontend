import { useEffect, useMemo } from 'react'

import { usePools } from '@/application/pools/usePools'
import { toPercent } from '@/functions/format/toPercent'

import { HydratedFarmInfo } from '../type'
import useFarms from '../useFarms'

export default function useInjectRaydiumFeeAprFromPair() {
  const pairs = usePools((s) => s.jsonInfos)

  const aprs = useMemo(() => Object.fromEntries(pairs.map((i) => [i.ammId, i.apr7d])), [pairs])
  const hydratedInfos = useFarms((s) => s.hydratedInfos)

  useEffect(() => {
    if (!Object.keys(aprs).length || !hydratedInfos.length) return

    const infosAreMeanless = hydratedInfos.every((i) => i.ammId == null)
    if (infosAreMeanless) return

    // already done , no need do again. this condition is to avoid death loop rerender
    const haveAlreadyParsed = hydratedInfos.some((i) => i.raydiumFeeRpr != null)
    if (haveAlreadyParsed) return

    const injectedHydratedInfos = hydratedInfos.map<HydratedFarmInfo>((i) => {
      if (!i.ammId) return i
      const raydiumFeeRpr = toPercent(aprs[i.ammId], { alreadyDecimaled: true })
      const newTotalApr = i.rewards.reduce((acc, { apr }) => (apr ? acc.add(apr) : acc), raydiumFeeRpr)
      return { ...i, raydiumFeeRpr, totalApr: newTotalApr }
    })

    useFarms.setState({ hydratedInfos: injectedHydratedInfos })
  }, [aprs, hydratedInfos])
}
