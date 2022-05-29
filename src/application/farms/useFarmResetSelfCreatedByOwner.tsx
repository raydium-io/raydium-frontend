import useWallet from '../wallet/useWallet'
import useFarms from './useFarms'
import { useEffect } from 'react'

export default function useFarmResetSelfCreatedByOwner() {
  const owner = useWallet((s) => s.owner)
  useEffect(() => {
    if (!owner) return
    useFarms.setState({ onlySelfCreatedFarms: false })
  }, [owner])
}
