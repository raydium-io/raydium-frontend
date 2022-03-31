import React, { ReactNode } from 'react'

import Grid from '@/components/Grid'
import PageLayout from '@/components/PageLayout'
import useIdo from '@/application/ido/useIdo'
import Row from '@/components/Row'
import { AddressItem } from '@/components/AddressItem'
import { ThreeSlotItem } from '@/components/ThreeSlotItem'
import { prependListener } from 'process'
import { toString } from '@/functions/numberish/toString'

export default function BasementPage() {
  return (
    <PageLayout mobileBarTitle="Staking" metaTitle="Staking - Raydium" contentButtonPaddingShorter>
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
              {Object.entries(idoHydratedInfoCollection ?? {}).map(([walletOwner, idoHydratedInfo]) => (
                <div key={walletOwner} className="mb-4">
                  <AddressItem>{walletOwner}</AddressItem>
                  <Row className="text-white gap-8">
                    {idoHydratedInfo.userEligibleTicketAmount && (
                      <ItemBlock
                        label="Eligible tickets"
                        value={String(idoHydratedInfo.userEligibleTicketAmount ?? '--')}
                      />
                    )}
                    {idoHydratedInfo.claimableQuote && (
                      <ItemBlock
                        label={`claimable quote(${idoHydratedInfo.quote?.symbol ?? '--'})`}
                        value={toString(idoHydratedInfo.claimableQuote)}
                      />
                    )}
                    {Boolean(idoHydratedInfo.ledger?.winningTickets?.length) && (
                      <ItemBlock label="Winning tickets count" value={idoHydratedInfo.ledger?.winningTickets?.length} />
                    )}
                  </Row>
                </div>
              ))}
            </div>
          )
        })}
      </Grid>
    </div>
  )
}

function ItemBlock(props: { label: ReactNode; value: ReactNode }) {
  return <ThreeSlotItem prefix={<div className="text-xs opacity-75">{props.label}: </div>} text={props.value} />
}
