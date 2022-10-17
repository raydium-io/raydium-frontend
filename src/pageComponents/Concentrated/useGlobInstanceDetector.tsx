import { useEffect, useId } from 'react'

const pageInstances = new Map<string, Set<string>>()

export function useGlobInstanceDetector(componentName: string) {
  const instanceSet = (() => {
    if (pageInstances.has(componentName)) {
      return pageInstances.get(componentName)!
    } else {
      const newInstanceSet = new Set<string>()
      pageInstances.set(componentName, newInstanceSet)
      return newInstanceSet
    }
  })()
  const componentId = useId()
  instanceSet.add(componentId)
  useEffect(
    () => () => {
      instanceSet.delete(componentId)
    },
    []
  )
  const isFirstDetectedComponentInThisPage = componentId === [...instanceSet][0]
  return { isFirstDetectedComponentInThisPage }
}
