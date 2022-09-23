import { useEffect } from 'react'

import useToken from '@/application/token/useToken'
import { isMintEqual } from '@/functions/judgers/areEqual'
import useAsyncEffect from '@/hooks/useAsyncEffect'

import useLiquidity from './useLiquidity'
import listToMap from '@/functions/format/listToMap'
import toPubString from '@/functions/format/toMintString'
import { getAddLiquidityDefaultPool } from '@/models/ammAndLiquidity'

/** coin1 coin2 ammId */
export default function useLiquidityAmmSelector() {
  const coin1 = useLiquidity((s) => s.coin1)
  const coin2 = useLiquidity((s) => s.coin2)
  const ammId = useLiquidity((s) => s.ammId)
  const currentJsonInfo = useLiquidity((s) => s.currentJsonInfo)

  /** update `coin1` and `coin2` (to match `ammId`) */
  useEffect(() => {
    if (!ammId) return
    const { coin1, coin2, jsonInfos } = useLiquidity.getState()
    const targetInfo = jsonInfos.find((info) => info.id === ammId)
    // current is right, no need to sync again
    if (isMintEqual(coin1?.mint, targetInfo?.baseMint) && isMintEqual(coin2?.mint, targetInfo?.quoteMint)) return
    if (isMintEqual(coin1?.mint, targetInfo?.quoteMint) && isMintEqual(coin2?.mint, targetInfo?.baseMint)) return

    const { getToken } = useToken.getState()
    const baseCoin = getToken(jsonInfos.find((i) => i.id === ammId)?.baseMint)
    const quoteCoin = getToken(jsonInfos.find((i) => i.id === ammId)?.quoteMint)
    useLiquidity.setState({
      coin1: baseCoin,
      coin2: quoteCoin
    })
  }, [ammId])

  /** update `ammId` (to match `coin1` and `coin2`) */
  useAsyncEffect(async () => {
    if (!coin1 || !coin2) return
    const { ammId, jsonInfos } = useLiquidity.getState()
    const jsonMap = listToMap(jsonInfos, (i) => toPubString(i.id))
    const best = await getAddLiquidityDefaultPool({ mint1: coin1.mint, mint2: coin2.mint })
    const resultPool = ammId ? jsonMap[ammId] || best : best
    if (resultPool) {
      // current is right, no need to sync again
      if (ammId === resultPool?.id) return
      useLiquidity.setState({
        ammId: resultPool?.id,
        currentJsonInfo: resultPool
      })
    } else {
      // should clear ammId and currentJsonInfo
      useLiquidity.setState({
        ammId: undefined,
        currentJsonInfo: undefined
      })
    }
  }, [coin1, coin2])

  // update `currentJsonInfo` (to match `ammId`)
  useEffect(() => {
    if (!ammId) return
    const { jsonInfos, currentJsonInfo } = useLiquidity.getState()

    const alreadyMatched = currentJsonInfo?.id === ammId
    if (alreadyMatched) return

    const matchedInfo = jsonInfos.find((i) => i.id === ammId)
    useLiquidity.setState({ currentJsonInfo: matchedInfo })
  }, [ammId])

  // update `ammId` (to match `currentJsonInfo`)
  useEffect(() => {
    const { currentJsonInfo } = useLiquidity.getState()
    if (!currentJsonInfo) return
    const { ammId: currentAmmId } = useLiquidity.getState()

    const alreadyMatched = currentJsonInfo?.id === currentAmmId
    if (alreadyMatched) return

    const ammId = currentJsonInfo?.id
    useLiquidity.setState({ ammId })
  }, [currentJsonInfo])
}
