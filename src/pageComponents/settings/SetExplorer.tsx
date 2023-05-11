import useAppSettings, { ExplorerName, ExplorerUrl } from '@/application/common/useAppSettings'
import Icon from '@/components/Icon'
import Row from '@/components/Row'

export default function SetExplorer() {
  const explorerName = useAppSettings((s) => s.explorerName)
  const explorerUrl = useAppSettings((s) => s.explorerUrl)

  return (
    <>
      <Row className="items-center mb-3 mobile:mb-6 gap-2">
        <div className="text-[rgba(171,196,255,0.5)] text-xs mobile:text-sm">DEFAULT EXPLORER</div>
      </Row>
      <Row className="gap-3 justify-between">
        <div
          className={`flex justify-around m-auto py-1 px-3 bg-[#141041] rounded-full text-[#F1F1F2] font-medium text-sm ${
            explorerName === ExplorerName.EXPLORER ? 'ring-1 ring-inset ring-[#39D0D8]' : ''
          } cursor-pointer`}
          onClick={() => {
            useAppSettings.setState({ explorerName: ExplorerName.EXPLORER, explorerUrl: ExplorerUrl.EXPLORER })
          }}
        >
          <Icon className="m-auto" iconSrc="https://img.raydium.io/ui/logo/solana-explorer.png" size="sm" />{' '}
          <div className="ml-2">Explorer</div>
        </div>
        <div
          className={`flex justify-around m-auto py-1 px-3 bg-[#141041] rounded-full text-[#F1F1F2] font-medium text-sm ${
            explorerName === ExplorerName.SOLSCAN ? 'ring-1 ring-inset ring-[#39D0D8]' : ''
          } cursor-pointer`}
          onClick={() => {
            useAppSettings.setState({ explorerName: ExplorerName.SOLSCAN, explorerUrl: ExplorerUrl.SOLSCAN })
          }}
        >
          <Icon className="m-auto" iconSrc="https://img.raydium.io/ui/logo/solscan.png" size="sm" />{' '}
          <div className="ml-2">Solscan</div>
        </div>
        <div
          className={`flex justify-around m-auto py-1 px-3 bg-[#141041] rounded-full text-[#F1F1F2] font-medium text-sm ${
            explorerName === ExplorerName.SOLANAFM ? 'ring-1 ring-inset ring-[#39D0D8]' : ''
          } cursor-pointer`}
          onClick={() => {
            useAppSettings.setState({ explorerName: ExplorerName.SOLANAFM, explorerUrl: ExplorerUrl.SOLANAFM })
          }}
        >
          <Icon className="m-auto" iconSrc="https://img.raydium.io/ui/logo/solanafm.png" size="sm" />{' '}
          <div className="ml-2">SolanaFM</div>
        </div>
      </Row>
    </>
  )
}
