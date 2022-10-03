import useAppSettings from '@/application/appSettings/useAppSettings'
import { SplToken } from '@/application/token/type'
import Card from '@/components/Card'
import CoinAvatar from '@/components/CoinAvatar'
import Row from '@/components/Row'
import { useState } from 'react'
import TokenSelectorDialog from '../dialogs/TokenSelectorDialog'

export interface PoolSelectCardHandle {
  validate?: () => void
  turnOffValidation?: () => void
}

export function PoolSelectCard() {
  const isMobile = useAppSettings((s) => s.isMobile)
  return (
    <Card
      className={`p-4 mobile:p-2 bg-cyberpunk-card-bg border-1.5 border-[#abc4ff1a] ${
        isMobile ? 'rounded-2xl' : 'rounded-3xl'
      }`}
    >
      <div>
        <div>Select Tokens</div>
        <SelectTokenItem title="Select Base Token →" />
        ➕
        <SelectTokenItem title="Select Quote Token →" />
      </div>
      <div>
        <div>Select Fee</div>
        <Row>
          <div>ba</div>
          <div>la</div>
          <div>ba</div>
          <div>la</div>
        </Row>
      </div>
    </Card>
  )
}

function SelectTokenItem({ title, onSelectToken }: { title?: string; onSelectToken?: (token: SplToken) => void }) {
  const [isSelectorOpen, setIsSelectorOpen] = useState(false)
  const [cachedToken, setCachedToken] = useState<SplToken>()
  return (
    <>
      <div className="bg-[#141041] rounded-xl py-4 px-8" onClick={() => setIsSelectorOpen(true)}>
        {cachedToken ? (
          <div>
            <CoinAvatar token={cachedToken} />
            <div>{cachedToken.symbol ?? ''}</div>
          </div>
        ) : (
          <div>{title}</div>
        )}
      </div>
      <TokenSelectorDialog
        open={isSelectorOpen}
        onClose={() => {
          setIsSelectorOpen(true)
        }}
        onSelectToken={(token) => {
          onSelectToken?.(token)
          setCachedToken(token)
        }}
      />
    </>
  )
}
