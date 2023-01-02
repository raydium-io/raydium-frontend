import useConnection from '../connection/useConnection'
import useWallet from '../wallet/useWallet'

import useAsyncEffect from '@/hooks/useAsyncEffect'
import { Utils1216 } from '@raydium-io/raydium-sdk'
import { getNegativeMoneyProgramId } from '../token/wellknownProgram.config'
import { useCompensationMoney } from './useCompensation'
import { hydrateNegativeMoneyInfo } from './hydrateCompensationInfo'
import useToken from '../token/useToken'

export default function useCompensationMoneyInfoLoader() {
  const connection = useConnection((s) => s.connection)
  const chainTimeOffset = useConnection((s) => s.chainTimeOffset) ?? 0
  const owner = useWallet((s) => s.owner)
  const { refreshCount } = useCompensationMoney()
  const lpTokens = useToken((s) => s.lpTokens)
  const tokens = useToken((s) => s.tokens)
  useAsyncEffect(async () => {
    if (!connection) return
    if (!owner) return

    useCompensationMoney.setState({ dataLoaded: false })
    const showInfos = await Utils1216.getAllInfo({
      connection,
      chainTime: (Date.now() + chainTimeOffset) / 1000,
      poolIds: Utils1216.DEFAULT_POOL_ID,
      programId: getNegativeMoneyProgramId(),
      wallet: owner
    })
    if (showInfos) {
      useCompensationMoney.setState({
        dataLoaded: true,
        hydratedCompensationInfoItems: showInfos.map((rawShowInfo) => hydrateNegativeMoneyInfo(rawShowInfo))
      })
    }
  }, [connection, refreshCount, owner, lpTokens, tokens])
}
