import React from 'react'

import Grid from '@/components/Grid'
import PageLayout from '@/components/PageLayout'
import useIdo from '@/application/ido/useIdo'

export default function BasementPage() {
  return (
    <PageLayout mobileBarTitle="Staking" metaTitle="Staking - Raydium" contentIsFixedLength>
      <IdoPanel />
    </PageLayout>
  )
}

function IdoPanel() {
  const idoHydratedInfos = useIdo((s) => s.idoHydratedInfos)
  const shadowIdoHydratedInfos = useIdo((s) => s.shadowIdoHydratedInfos) // maybe independent it from useEffect
  // console.log('shadowIdoHydratedInfos: ', shadowIdoHydratedInfos)
  return (
    <Grid className="grid-cols-[1fr,1fr,1fr] gap-8 pb-4 pt-2">
      <div className="title text-2xl text-white col-span-full">Ido Tickets</div>
      <div className="justify-self-end"></div>
    </Grid>
  )
}
