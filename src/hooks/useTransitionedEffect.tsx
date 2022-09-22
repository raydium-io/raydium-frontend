import { startTransition, useEffect } from 'react'

export function useTransitionedEffect(effect: () => any, dependenceList?: any[]) {
  useEffect(() => {
    startTransition(() => {
      effect()
    })
  }, dependenceList)
}
