import fs from 'fs'

import { getMultipleAccountsInfo } from '@raydium-io/raydium-sdk'
import { Connection, PublicKey } from '@solana/web3.js'

import { Ido, IDO_POOLS, IdoPoolJsonInfo, Snapshot } from '../src/utils/sdk'

const timestamp = new Date().toISOString().replace(/\.\d+Z/i, '+0000')

function writeJson(fileName: string, context: any) {
  fs.writeFileSync(fileName, `${JSON.stringify(context, null, 2)}\n`)
}

;(async () => {
  const connection = new Connection('https://free.rpcpool.com')

  // fetch ido pools
  const accountsInfo = await getMultipleAccountsInfo(
    connection,
    IDO_POOLS.map((pool) => {
      return new PublicKey(pool.id)
    }),
    { batchRequest: true }
  )

  const pools: IdoPoolJsonInfo[] = []

  for (const index in accountsInfo) {
    const pool = IDO_POOLS[index]
    const accountInfo = accountsInfo[index]

    if (!accountInfo) {
      console.log(`IDO Pool: ${pool.id} state null info}`)
      process.exit(1)
    }

    const { data } = accountInfo
    const { version, snapshotVersion } = pool

    const programId = Ido.getProgramId(version)
    const snapshotProgramId = Snapshot.getProgramId(snapshotVersion)

    const IDO_STATE_LAYOUT = Ido.getStateLayout(version)
    if (data.length !== IDO_STATE_LAYOUT.span) {
      console.log(
        `IDO Pool: ${pool.id}: state invalid data length, expected to be: ${IDO_STATE_LAYOUT.span} on chain: ${data.length}`
      )
      process.exit(1)
    }

    const { seedId, baseMint, quoteMint, baseVault, quoteVault } = IDO_STATE_LAYOUT.decode(data)

    const authority = await Ido.getAuthority({ programId, poolId: new PublicKey(pool.id) })
    pools.push({
      id: pool.id,

      version,
      programId: programId.toBase58(),

      snapshotVersion,
      snapshotProgramId: snapshotProgramId.toBase58(),

      authority: authority.toBase58(),
      seedId: seedId.toBase58(),
      baseMint: baseMint.toBase58(),
      quoteMint: quoteMint.toBase58(),
      baseVault: baseVault.toBase58(),
      quoteVault: quoteVault.toBase58()
    })
  }

  writeJson(`./public/ido.json`, {
    name: 'Raydium Mainnet IDO Pools',
    timestamp,
    version: {
      major: 1,
      minor: 0,
      patch: 0
    },
    official: pools
  })
})()
