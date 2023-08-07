import useWallet from '@/application/wallet/useWallet'
import { TxVersion } from '@raydium-io/raydium-sdk'
import Row from '../Row'
import Switcher from '../Switcher'
import Tooltip from '../Tooltip'
import Icon from '../Icon'
import useAppSettings from '@/application/common/useAppSettings'

/** this should be used only in ./Navbar.tsx */
export function TxVersionWidget() {
  const txVersion = useWallet((s) => s.txVersion)
  const isMobile = useAppSettings((s) => s.isMobile)
  return (
    <Row className="mobile:flex-col-reverse mobile:translate-y-1 mobile:gap-0 items-center gap-2">
      <Row className="items-center gap-1 text-[#abc4ff80]">
        <div className="mobile:text-2xs text-sm">Vers.TX</div>
        <Tooltip placement="bottom">
          <Icon size={isMobile ? 'xs' : 'sm'} heroIconName="information-circle" />
          <Tooltip.Panel>
            <div className="max-w-[300px] space-y-1.5">
              Versioned Transactions are a new transaction format that allows for additional functionality, including
              advanced swap routing. Before turning on Vers. Tx, ensure that your wallet is compatible.
            </div>
          </Tooltip.Panel>
        </Tooltip>
      </Row>

      <Switcher
        // className="mobile:h-4"
        checked={txVersion === TxVersion.V0}
        onToggle={() => {
          useWallet.setState((s) =>
            s.txVersion === TxVersion.LEGACY ? { txVersion: TxVersion.V0 } : { txVersion: TxVersion.LEGACY }
          )
        }}
      />
    </Row>
  )
}
