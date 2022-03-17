import { useEffect } from 'react'

import { getLocalItem } from '@/functions/dom/jStorage'

import useCreatePool from '../useCreatePool'

export default function useInitlyGetCreatedPoolExhibitionData() {
  useEffect(extractLocalStorage, [])
}

function extractLocalStorage() {
  const records = getLocalItem('RAY_CREATED_POOL_HISTORY')
  if (records) {
    useCreatePool.setState({ createdPoolHistory: records })
  }
}
