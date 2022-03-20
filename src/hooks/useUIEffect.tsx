import { useEffect } from 'react'

/**
 * After React change has commit to browser, so that you can access UI in screen.
 * but it cannot have returned clean function
 *  ! have to lay ui logic it in setTimeout to guarantee the React has committed  for `.getBoundingClientRect()`
 */
export function useUIEffect(effect: () => void, dependenceList?: any[]) {
  useEffect(() => {
    setTimeout(effect, 0)
  }, dependenceList)
}
