import useInit from '@/hooks/useInit'
import { getLocalItem, setLocalItem } from '@/functions/dom/jStorage'
import { useEffect } from 'react'
import { useConcentrated } from './useConcentrated'

const key = 'APR_CALC_MODE'
export function useConcentratedAprCalcMethodSyncer() {
  const aprCalcMode = useConcentrated((s) => s.aprCalcMode)
  useInit(() => {
    const v = getLocalItem<'A' | 'D' | 'C'>(key)
    if (v === 'A' || v === 'D' || v === 'C') {
      useConcentrated.setState({ aprCalcMode: v })
    }
  })
  useEffect(() => {
    const v = getLocalItem<'A' | 'D' | 'C'>(key)
    if (v !== aprCalcMode) {
      setLocalItem(key, aprCalcMode)
    }
  }, [aprCalcMode])
}
