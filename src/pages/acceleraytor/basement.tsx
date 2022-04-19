import React, { ReactNode } from 'react'

import Grid from '@/components/Grid'
import PageLayout from '@/components/PageLayout'
import useIdo from '@/application/ido/useIdo'
import { AddressItem } from '@/components/AddressItem'
import { ThreeSlotItem } from '@/components/ThreeSlotItem'
import { toString } from '@/functions/numberish/toString'
import { add } from '@/functions/numberish/operations'
import { Numberish } from '@/types/constants'
import Button from '@/components/Button'
import txIdoClaim from '@/application/ido/utils/txIdoClaim'
import useWallet from '@/application/wallet/useWallet'
import toPubString from '@/functions/format/toMintString'

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
  const shadowKeypairs = useWallet((s) => s.shadowKeypairs)
  return (
    <div className="justify-self-end">
      <div className="text-2xl mobile:text-lg font-semibold justify-self-start text-white col-span-full mb-8">
        Ido Tickets
      </div>
      <Grid className="grid-cols-2 gap-24 pb-4 pt-2">
        {Object.entries(shadowIdoHydratedInfos ?? {}).map(([idoId, idoHydratedInfoCollection]) => (
          <Grid key={idoId} className="gap-2">
            <div className="text-2xl mobile:text-lg font-semibold justify-self-start text-white col-span-full mb-8">
              {Object.values(idoHydratedInfoCollection)[0].base?.symbol}
            </div>
            {Object.entries(idoHydratedInfoCollection ?? {}).map(([walletOwner, idoHydratedInfo]) => (
              <div key={walletOwner}>
                <AddressItem>{walletOwner}</AddressItem>
                <Grid className="grid-cols-3 gap-4">
                  <ItemBlock
                    label="Eligible tickets"
                    value={String(idoHydratedInfo.userEligibleTicketAmount ?? '--')}
                  />
                  <ItemBlock label="Winning tickets count" value={idoHydratedInfo.winningTickets?.length} />
                  <div>
                    <ItemBlock
                      label={`claimable ${idoHydratedInfo.quote?.symbol ?? '--'}`}
                      value={toString(idoHydratedInfo.claimableQuote)}
                    />
                    <Button
                      className="frosted-glass-teal"
                      size="sm"
                      onClick={() => {
                        const targetKeypair = shadowKeypairs?.find(
                          (keypair) => toPubString(keypair.publicKey) === walletOwner
                        )
                        txIdoClaim({
                          idoInfo: idoHydratedInfo,
                          side: 'quote',
                          forceKeyPairs: targetKeypair ? { ownerKeypair: targetKeypair } : undefined
                        })
                      }}
                    >
                      claim
                    </Button>
                  </div>
                </Grid>
              </div>
            ))}
            <Grid className="grid-cols-3 gap-4">
              <ItemBlock
                label="Total Eligible tickets"
                value={toString(
                  Object.values(idoHydratedInfoCollection ?? {}).reduce(
                    (acc, idoHydratedInfo) => add(acc, idoHydratedInfo.userEligibleTicketAmount ?? 0),
                    0 as Numberish
                  )
                )}
              />
              <ItemBlock
                label="Total winning tickets"
                value={toString(
                  Object.values(idoHydratedInfoCollection ?? {}).reduce(
                    (acc, idoHydratedInfo) => add(acc, idoHydratedInfo.winningTickets?.length ?? 0),
                    0 as Numberish
                  )
                )}
              />
              <ItemBlock
                label={`Total claimable ${idoHydratedInfos?.[idoId]?.quote?.symbol ?? '--'}`}
                value={toString(
                  Object.values(idoHydratedInfoCollection ?? {}).reduce(
                    (acc, idoHydratedInfo) => add(acc, idoHydratedInfo.claimableQuote ?? 0),
                    0 as Numberish
                  )
                )}
              />
            </Grid>
          </Grid>
        ))}
      </Grid>
    </div>
  )
}

function ItemBlock(props: { label: ReactNode; value: ReactNode }) {
  return (
    <ThreeSlotItem
      prefix={<div className="text-xs opacity-75">{props.label}: </div>}
      text={props.value}
      textClassName="text-base"
    />
  )
}
