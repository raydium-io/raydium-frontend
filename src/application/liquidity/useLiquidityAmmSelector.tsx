import { use, useEffect } from 'react'

import useToken from '@/application/token/useToken'
import { isMintEqual } from '@/functions/judgers/areEqual'
import useAsyncEffect from '@/hooks/useAsyncEffect'

import useLiquidity from './useLiquidity'
import listToMap from '@/functions/format/listToMap'
import toPubString from '@/functions/format/toMintString'
import { getAddLiquidityDefaultPool } from '@/application/ammV3PoolInfoAndLiquidity/ammAndLiquidity'
import { clear } from 'console'
import { useRecordedEffect } from '@/hooks/useRecordedEffect'

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
      ...(baseCoin ? { coin1: baseCoin } : {}),
      ...(quoteCoin ? { coin2: quoteCoin } : {})
    })
  }, [ammId])

  /** update `ammId` (to match `coin1` and `coin2`) */
  useAsyncEffect(async () => {
    if (!coin1 || !coin2) return
    const { ammId: oldAmmId, jsonInfos } = useLiquidity.getState()
    useLiquidity.setState({ hasFinishFinding: false })
    const jsonMap = listToMap(jsonInfos, (i) => toPubString(i.id))

    const oldPoolInfo = oldAmmId ? jsonMap[oldAmmId] : undefined

    // current is right, no need to sync again
    if (isMintEqual(coin1?.mint, oldPoolInfo?.baseMint) && isMintEqual(coin2?.mint, oldPoolInfo?.quoteMint)) {
      useLiquidity.setState({ hasFinishFinding: true })
      return
    }
    if (isMintEqual(coin1?.mint, oldPoolInfo?.quoteMint) && isMintEqual(coin2?.mint, oldPoolInfo?.baseMint)) {
      useLiquidity.setState({ hasFinishFinding: true })
      return
    }

    const best = await getAddLiquidityDefaultPool({ mint1: coin1.mint, mint2: coin2.mint })
    if (best) {
      // current is right, no need to sync again
      if (oldAmmId === best?.id) return
      useLiquidity.setState({
        ammId: best?.id
      })
    } else {
      // should clear ammId and currentJsonInfo
      useLiquidity.setState({
        ammId: undefined,
        hasFinishFinding: true
      })
    }
  }, [coin1, coin2])

  // update `currentJsonInfo` (to match `ammId`)
  useRecordedEffect(() => {
    if (!ammId) {
      useLiquidity.setState({ currentJsonInfo: undefined })
      return
    }
    const { jsonInfos, currentJsonInfo } = useLiquidity.getState()

    const alreadyMatched = currentJsonInfo?.id === ammId
    if (alreadyMatched) {
      useLiquidity.setState({ hasFinishFinding: true })
      return
    }

    const matchedInfo = jsonInfos.find((i) => i.id === ammId)
    useLiquidity.setState({ currentJsonInfo: matchedInfo, hasFinishFinding: true })
  }, [ammId])

  // update `ammId` (to match `currentJsonInfo`)
  useEffect(() => {
    const { currentJsonInfo } = useLiquidity.getState()
    if (!currentJsonInfo) {
      useLiquidity.setState({ ammId: undefined })
      return
    }
    const { ammId: currentAmmId } = useLiquidity.getState()

    const alreadyMatched = currentJsonInfo?.id === currentAmmId
    if (alreadyMatched) return

    const ammId = currentJsonInfo?.id
    useLiquidity.setState({ ammId })
  }, [currentJsonInfo])
}
