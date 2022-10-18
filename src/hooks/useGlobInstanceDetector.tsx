import { useEffect, useId } from 'react'

const pageInstances = new Map<string, Set<string>>()

export default function useGlobInstanceDetector(componentName: string | undefined) {
  if (!componentName) return { isFirstDetectedComponentInThisPage: false }
  const componentId = useId()
  const instanceSet = (() => {
    if (pageInstances.has(componentName)) {
      return pageInstances.get(componentName)!
    } else {
      const newInstanceSet = new Set<string>()
      pageInstances.set(componentName, newInstanceSet)
      return newInstanceSet
    }
  })()
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
