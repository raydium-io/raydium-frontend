import { getSessionItem, setSessionItem } from '@/functions/dom/jStorage'
import toPubString from '@/functions/format/toMintString'
import { isMintEqual } from '@/functions/judgers/areEqual'
import { useRecordedEffect } from '@/hooks/useRecordedEffect'
import { useRouter } from 'next/router'
import { useEffect } from 'react'
import { routeTo } from '../routeTools'
import useConcentrated from './useConcentrated'

const nftMintName = 'MY_POSITION_NFT_MINT'
const myPositionAmmIdName = 'MY_POSITION_AMM_ID'

/** position id */
export default function useConcentratedMyPositionUrlParser() {
  const { pathname, query } = useRouter()
  const targetUserPositionAccount = useConcentrated((s) => s.targetUserPositionAccount)
  const hydratedAmmPools = useConcentrated((s) => s.hydratedAmmPools)

  const nftMint = toPubString(targetUserPositionAccount?.nftMint)
  const queryString = JSON.stringify(query) // compare flag
  useEffect(() => {
    if (!pathname.includes('my-position')) return
    if (targetUserPositionAccount && nftMint) {
      setSessionItem(nftMintName, nftMint)
      setSessionItem(myPositionAmmIdName, toPubString(targetUserPositionAccount.poolId))
    } else {
      const storagedNftMint = getSessionItem<string>(nftMintName)
      const ammId = getSessionItem<string>(myPositionAmmIdName)

      const currentAmmPool = hydratedAmmPools.find(({ id }) => isMintEqual(ammId, id))
      const targetUserPositionAccount = currentAmmPool?.userPositionAccount?.find(({ nftMint }) =>
        isMintEqual(nftMint, storagedNftMint)
      )
      if (currentAmmPool && targetUserPositionAccount) {
        useConcentrated.setState({
          currentAmmPool,
          targetUserPositionAccount
        })
      }
    }
  }, [nftMint, pathname, hydratedAmmPools, queryString]) // nftMint is global unique (use nftMint to detect change)

  useRecordedEffect(
    ([prevPathname]) => {
      const storagedNftMint = getSessionItem<string>(nftMintName)
      const ammId = getSessionItem<string>(myPositionAmmIdName)
      if (!prevPathname && pathname.includes('my-position') && !storagedNftMint && !ammId) {
        routeTo('/clmm/pools')
      }
      if (pathname === '/clmm/my-position' && hydratedAmmPools.length) {
        const currentAmmPool = hydratedAmmPools.find(({ id }) => isMintEqual(ammId, id))
        const targetUserPositionAccount = currentAmmPool?.userPositionAccount?.find(({ nftMint }) =>
          isMintEqual(nftMint, storagedNftMint)
        )
        if (!targetUserPositionAccount) {
          routeTo('/clmm/pools')
        }
      }
    },
    [pathname, hydratedAmmPools]
  )
}
