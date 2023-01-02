import useConnection from '../connection/useConnection'
import useWallet from '../wallet/useWallet'

import useAsyncEffect from '@/hooks/useAsyncEffect'
import { Utils1216 } from '@raydium-io/raydium-sdk'
import { getNegativeMoneyProgramId } from '../token/wellknownProgram.config'
import { useCompensationMoney } from './useCompensation'
import { hydrateNegativeMoneyInfo } from './hydrateCompensationInfo'

export default function useCompensationMoneyInfoLoader() {
  const { connection, chainTimeOffset = 0 } = useConnection()
  const { owner } = useWallet()
  useAsyncEffect(async () => {
    if (!connection) return
    if (!owner) return

    const showInfos = await Utils1216.getAllInfo({
      connection,
      chainTime: (Date.now() + chainTimeOffset) / 1000,
      poolIds: Utils1216.DEFAULT_POOL_ID,
      programId: getNegativeMoneyProgramId(),
      wallet: owner
    })
    if (showInfos) {
      useCompensationMoney.setState({
        showInfos: showInfos.map((rawShowInfo) => hydrateNegativeMoneyInfo(rawShowInfo))
      })
    }
  }, [connection])
}
