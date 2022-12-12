import useWallet from '@/application/wallet/useWallet'
import { unifyByKey } from '@/functions/arrayMethods'
import assert from '@/functions/assert'
import { setLocalItem } from '@/functions/dom/jStorage'

import { CreatedPoolRecord } from './type'
import useCreatePool from './useCreatePool'

export function recordCreatedPool() {
  const { lpMint, marketId, ammId, baseMint, quoteMint, baseDecimals, quoteDecimals } = useCreatePool.getState()

  assert(lpMint, 'required create-pool step 1, it will cause info injection')
  assert(marketId, 'required create-pool step 1, it will cause info injection')
  assert(ammId, 'required create-pool step 1, it will cause info injection')
  assert(baseMint, 'required create-pool step 1, it will cause info injection')
  assert(quoteMint, 'required create-pool step 1, it will cause info injection')
  assert(baseDecimals != null, 'required create-pool step 1, it will cause info injection')
  assert(quoteDecimals != null, 'required create-pool step 1, it will cause info injection')

  const { adapter } = useWallet.getState()
  const owner = adapter?.publicKey
  assert(owner, 'no wallet owner')

  const newRecordedItem: CreatedPoolRecord = {
    lpMint,
    marketId,
    ammId,
    baseMint,
    quoteMint,
    baseDecimals,
    quoteDecimals,
    timestamp: Date.now(),
    walletOwner: String(owner)
  }

  // eslint-disable-next-line no-console
  console.log('new created pool history Item: ', newRecordedItem)

  const { createdPoolHistory } = useCreatePool.getState()

  const newCreatedPoolHistoryList = unifyByKey(
    [...(createdPoolHistory[String(owner)] ?? []), newRecordedItem],
    (i) => i.ammId
  )

  const newCreatedPoolHistory = {
    ...createdPoolHistory,
    [String(owner)]: newCreatedPoolHistoryList
  }

  useCreatePool.setState({
    createdPoolHistory: newCreatedPoolHistory
  })

  setLocalItem('RAY_CREATED_POOL_HISTORY', newCreatedPoolHistory)
}
