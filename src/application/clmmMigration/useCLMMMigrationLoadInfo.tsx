import jFetch from '@/functions/dom/jFetch'
import useAsyncEffect from '@/hooks/useAsyncEffect'
import { useEffect } from 'react'
import useConcentrated from '../concentrated/useConcentrated'
import { CLMMMigrationJSON, useCLMMMigration } from './useCLMMMigration'

export function useCLMMMigrationLoadInfo() {
  useAsyncEffect(async () => {
    const json = await jFetch<{ data: CLMMMigrationJSON[] }>('https://api.raydium.io/v2/main/migrate-lp')
    if (!json) return
    useCLMMMigration.setState({ jsonInfos: json.data })
    useCLMMMigration.setState({ shouldLoadedClmmIds: new Set(json.data.map((i) => i.clmmId)) }) // TEMP for dev
  }, [])

  const hydratedClmmInfos = useConcentrated((s) => s.hydratedAmmPools)
  const shouldLoadedClmmIds = useCLMMMigration((s) => s.shouldLoadedClmmIds)
  const shouldLoadedClmmIdsStack = [] as string[]
  useEffect(() => {
    if (shouldLoadedClmmIds.size) {
      shouldLoadedClmmIds.forEach((clmmId) => {
        const foundClmmInfo = hydratedClmmInfos.find((i) => i.idString === clmmId)
        if (foundClmmInfo) {
          useCLMMMigration.setState((s) => ({
            loadedHydratedClmmInfos: s.loadedHydratedClmmInfos.set(clmmId, foundClmmInfo)
          }))
          const shouldLoadedClmmIds = useCLMMMigration.getState().shouldLoadedClmmIds
          shouldLoadedClmmIds.delete(clmmId)
        } else {
          shouldLoadedClmmIdsStack.push(clmmId)
        }
      })
    }

    if (shouldLoadedClmmIdsStack.length) {
      // TODO: load part of clmms
      useConcentrated.getState().refreshConcentrated()
    }
  }, [shouldLoadedClmmIds, hydratedClmmInfos])
}
