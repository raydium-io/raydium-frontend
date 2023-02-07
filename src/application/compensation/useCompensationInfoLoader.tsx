import useConnection from '../connection/useConnection'
import useWallet from '../wallet/useWallet'

import useAsyncEffect from '@/hooks/useAsyncEffect'
import { Utils1216 } from '@raydium-io/raydium-sdk'
import useToken from '../token/useToken'
import { SDK_PROGRAM_IDS } from '../token/wellknownProgram.config'
import { hydrateNegativeMoneyInfo } from './hydrateCompensationInfo'
import { useCompensationMoney } from './useCompensation'

export default function useCompensationMoneyInfoLoader() {
  const connection = useConnection((s) => s.connection)
  const chainTimeOffset = useConnection((s) => s.chainTimeOffset) ?? 0
  const owner = useWallet((s) => s.owner)
  const { refreshCount } = useCompensationMoney()
  const lpTokens = useToken((s) => s.lpTokens)
  const tokens = useToken((s) => s.tokens)
  useAsyncEffect(async () => {
    if (!connection) return
    if (!owner) {
      if (useCompensationMoney.getState().hydratedCompensationInfoItems) {
        useCompensationMoney.setState({ hydratedCompensationInfoItems: undefined })
      }
      return
    }

    useCompensationMoney.setState({ dataLoaded: false })

    const params = {
      connection,
      chainTime: (Date.now() + chainTimeOffset) / 1000,
      poolIds: Utils1216.DEFAULT_POOL_ID,
      programId: SDK_PROGRAM_IDS.UTIL1216,
      wallet: owner
    }
    const showInfos = await Utils1216.getAllInfo(params)
    if (showInfos) {
      useCompensationMoney.setState({
        dataLoaded: true,
        hydratedCompensationInfoItems: showInfos.map((rawShowInfo) => hydrateNegativeMoneyInfo(rawShowInfo))
      })
    }
  }, [connection, refreshCount, owner, lpTokens, tokens])
}
