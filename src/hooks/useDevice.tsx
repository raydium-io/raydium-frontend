import { getPlatformInfo } from '../functions/dom/getPlatformInfo'
import useMedia from './useMedia'

const breakPointsconfigs = {
  isMobile: '(max-width: 1000px)',
  isTablet: '(max-width: 1280px)', // only js and avoid to use it as much as you can, it can cause css media query confuse
  isPc: '(max-width: 99999px)'
} // order is important cause only one condition will result true detected by browser

export default function useDevice() {
  const currentBreakPoint = useMedia(
    Object.values(breakPointsconfigs),
    Object.keys(breakPointsconfigs) as (keyof typeof breakPointsconfigs)[],
    getPlatformInfo()?.isPc ? 'isPc' : 'isMobile'
  )
  return {
    isMobile: currentBreakPoint === 'isMobile',
    isTablet: currentBreakPoint === 'isTablet',
    isPc: currentBreakPoint === 'isPc'
  }
}
