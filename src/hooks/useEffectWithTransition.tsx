import { startTransition, useEffect } from 'react'

export function useEffectWithTransition(effect: () => any, dependenceList?: any[]) {
  useEffect(() => {
    startTransition(() => {
      effect()
    })
  }, dependenceList)
}
