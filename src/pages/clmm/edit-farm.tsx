import { useEffect } from 'react'
import { useRouter } from 'next/router'
import shallow from 'zustand/shallow'

import useConcentrated from '@/application/concentrated/useConcentrated'
import useConnection from '@/application/connection/useConnection'
import useToken from '@/application/token/useToken'
import PageLayout from '@/components/PageLayout'
import EditFarm from '@/pageComponents/ConcentratedEdit/EditFarm'
import NavButtons from '@/pageComponents/ConcentratedEdit/NavButtons'

export default function EditFarmPage() {
  const connection = useConnection((s) => s.connection)
  const getToken = useToken((s) => s.getToken)
  const [hydratedAmmPools, fetchWhitelistRewards] = useConcentrated(
    (s) => [s.hydratedAmmPools, s.fetchWhitelistRewards],
    shallow
  )
  const { query } = useRouter()
  const farmId = query?.farmId

  useEffect(() => {
    if (!farmId) return
    const poolFarm = hydratedAmmPools.find((pool) => pool.idString === farmId)
    if (poolFarm)
      useConcentrated.setState({
        currentAmmPool: poolFarm
      })
  }, [farmId, hydratedAmmPools])

  useEffect(() => {
    connection && !!getToken && fetchWhitelistRewards()
  }, [fetchWhitelistRewards, connection, getToken])

  return (
    <PageLayout metaTitle="Concentrated Pools - Raydium">
      <NavButtons />
      <div className="w-full flex justify-center items-center">
        <EditFarm />
      </div>
    </PageLayout>
  )
}
