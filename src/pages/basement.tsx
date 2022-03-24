import React from 'react'

import Grid from '@/components/Grid'
import PageLayout from '@/components/PageLayout'
import useIdo from '@/application/ido/useIdo'
import Row from '@/components/Row'

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
  // eslint-disable-next-line no-console
  console.log('shadowIdoHydratedInfos: ', shadowIdoHydratedInfos)
  return (
    <div className="justify-self-end">
      <div className="text-2xl mobile:text-lg font-semibold justify-self-start text-white col-span-full mb-8">
        Ido Tickets
      </div>
      <Grid className="grid-cols-[1fr,1fr,1fr] gap-8 pb-4 pt-2">
        {Object.entries(shadowIdoHydratedInfos ?? {}).map(([idoId, idoHydratedInfoCollection]) => {
          const exampleIdoInfo = Object.values(idoHydratedInfoCollection)[0]
          return (
            <div key={idoId}>
              <div className="text-2xl mobile:text-lg font-semibold justify-self-start text-white col-span-full mb-8">
                {exampleIdoInfo.base?.symbol}
              </div>
              {Object.entries(idoHydratedInfoCollection ?? {})}
              <Row className="text-2xl mobile:text-lg font-semibold justify-self-start text-white col-span-full mb-8">
                <div></div>
              </Row>
            </div>
          )
        })}
      </Grid>
    </div>
  )
}
