import toPubString from '@/functions/format/toMintString'
import { useEffect } from 'react'
import useConcentrated from './useConcentrated'

export default function useConcentratedInitFeeSelector() {
  const existAmmPools = useConcentrated((s) => s.selectableAmmPools)
  const existAmmPoolConfigIds = existAmmPools?.map((i) => toPubString(i.ammConfig.id))
  const ammConfigFeeOptions = useConcentrated((s) => s.availableAmmConfigFeeOptions)
  const selectableAmmConfigs = ammConfigFeeOptions?.filter(
    (ammConfigFeeOption) => !existAmmPoolConfigIds?.includes(ammConfigFeeOption.id)
  )
  const key = selectableAmmConfigs?.map((i) => i.id).join('_')

  useEffect(() => {
    if (!selectableAmmConfigs) return
    const bestFeeOption = selectableAmmConfigs[selectableAmmConfigs.length - 1]
    bestFeeOption && useConcentrated.setState({ userSelectedAmmConfigFeeOption: bestFeeOption })
  }, [key])
}
