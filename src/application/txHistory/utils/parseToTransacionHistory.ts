import { HexAddress } from '@/types/constants'

import { TxHistoryInfo } from '../useTxHistory'

export default function parseToTransacionHistory(owner: HexAddress, rawHistory: any): TxHistoryInfo[] {
  function spawnTitleFromOld(item: TxHistoryInfo): TxHistoryInfo {
    const isSwap = item.description?.toLowerCase().includes('swap')
    if (isSwap) return { title: 'Swap', ...item }
    const isLiquidity = item.description?.toLowerCase().includes('add liquidity')
    if (isLiquidity) return { title: 'Add Liquidity', ...item }
    const isHarvest = item.description?.toLowerCase().includes('harvest')
    if (isHarvest) return { title: 'Harvest', ...item }
    const isClaim = item.description?.toLowerCase().includes('claim')
    if (isClaim) return { title: 'Claim', ...item }
    const isStake = item.description?.toLowerCase().includes('stake')
    if (isStake) return { title: 'Stake', ...item }
    return item
  }
  const targetHistory = rawHistory?.[owner] ?? {}
  return Object.entries(targetHistory)
    .map(([txid, txInfo]) => ({
      ...(txInfo as any),
      txid
    }))
    .sort((a, b) => (b.time || b.t) - (a.time || a.t))
    .slice(0, 19)
    .map(spawnTitleFromOld)
}
