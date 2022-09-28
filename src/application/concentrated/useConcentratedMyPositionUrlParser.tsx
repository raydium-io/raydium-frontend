import { getSessionItem, setSessionItem } from '@/functions/dom/jStorage'
import { toHumanReadable } from '@/functions/format/toHumanReadable'
import toPubString from '@/functions/format/toMintString'
import { isMintEqual } from '@/functions/judgers/areEqual'
import { useRecordedEffect } from '@/hooks/useRecordedEffect'
import { useRouter } from 'next/router'
import { useEffect } from 'react'
import useUpdateUrlFn from '../txTools/useUpdateUrlFn'
import useConcentrated from './useConcentrated'

const sessionName = 'MY_POSITION_NFT_MINT'

/** position id */
export default function useConcentratedMyPositionUrlParser() {
  const { pathname, query } = useRouter()
  const updateUrl = useUpdateUrlFn()
  const targetUserPositionAccount = useConcentrated((s) => s.targetUserPositionAccount)
  const hydrateConcentratedInfo = useConcentrated((s) => s.hydratedAmmPools)

  const nftMint = toPubString(targetUserPositionAccount?.nftMint)
  const queryString = JSON.stringify(query) // compare flag
  useEffect(() => {
    if (!pathname.includes('my-position')) return
    if (targetUserPositionAccount && nftMint) {
      updateUrl(pathname, { ['ammid']: toPubString(targetUserPositionAccount.poolId) })
      setSessionItem(sessionName, nftMint)
    } else {
      const storagedNftMint = getSessionItem<string>(sessionName)
      const ammId = query['ammid'] ? String(query['ammid']).trim() : undefined

      const currentAmmPool = hydrateConcentratedInfo.find(({ id }) => isMintEqual(ammId, id))
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
  }, [nftMint, pathname, hydrateConcentratedInfo, queryString]) // nftMint is global unique (use nftMint to detect change)

  useRecordedEffect(
    ([prevPathname]) => {
      if (prevPathname?.includes('my-position') && !pathname.includes('my-position')) {
        updateUrl(pathname, {})
      }
    },
    [pathname]
  )
}
