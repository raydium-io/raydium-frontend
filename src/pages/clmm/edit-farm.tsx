import { useEffect } from 'react'
import { useRouter } from 'next/router'
import useConcentrated from '@/application/concentrated/useConcentrated'
import PageLayout from '@/components/PageLayout'
import NavButtons from '@/pageComponents/ConcentratedEdit/NavButtons'
import EditFarm from '@/pageComponents/ConcentratedEdit/EditFarm'

export default function EditFarmPage() {
  const hydratedAmmPools = useConcentrated((s) => s.hydratedAmmPools)
  const { query } = useRouter()
  const farmId = query?.farmId

  useEffect(() => {
    if (!farmId) return
    const poolFarm = hydratedAmmPools.find((pool) => pool.idString === farmId)
    useConcentrated.setState({
      currentAmmPool: poolFarm
    })
  }, [farmId, hydratedAmmPools])

  return (
    <PageLayout metaTitle="Concentrated Pools - Raydium">
      <NavButtons />
      <EditFarm />
    </PageLayout>
  )
}
