import useWallet from '@/application/wallet/useWallet'
import { TxVersion } from '@raydium-io/raydium-sdk'
import Row from '../Row'
import Switcher from '../Switcher'

/** this should be used only in ./Navbar.tsx */
export function TxVersionWidget() {
  const txVersion = useWallet((s) => s.txVersion)
  return (
    <Row className="mobile:flex-col-reverse mobile:gap-0 items-center gap-2">
      <div className="mobile:text-2xs text-sm text-[#abc4ff80]">ver.TX</div>
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
