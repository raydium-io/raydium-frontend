import useAppSettings from '@/application/appSettings/useAppSettings'
import useConcentrated from '@/application/concentrated/useConcentrated'
import { SplToken } from '@/application/token/type'
import Card from '@/components/Card'
import CoinAvatar from '@/components/CoinAvatar'
import Input from '@/components/Input'
import Row from '@/components/Row'
import toPubString from '@/functions/format/toMintString'
import { toPercent } from '@/functions/format/toPercent'
import toPercentString from '@/functions/format/toPercentString'
import { div } from '@/functions/numberish/operations'
import { useState } from 'react'
import { twMerge } from 'tailwind-merge'
import TokenSelectorDialog from '../dialogs/TokenSelectorDialog'

export function CreatePoolCard() {
  const isMobile = useAppSettings((s) => s.isMobile)
  const selectableAmmPools = useConcentrated((s) => s.selectableAmmPools)
  const selectableAmmPoolIds = selectableAmmPools?.map((i) => toPubString(i.id))
  const userSelectedAmmConfigFeeOption = useConcentrated((s) => s.userSelectedAmmConfigFeeOption)
  const availableAmmConfigFeeOptions = useConcentrated((s) => s.availableAmmConfigFeeOptions)
  const availableAmmConfigFeeOptionsWithCreatable = availableAmmConfigFeeOptions?.map((i) => ({
    originalData: i,
    ...i,
    protocolFeeRate: toPercent(div(i.protocolFeeRate, 10 ** 4), { alreadyDecimaled: true }),
    tradeFeeRate: toPercent(div(i.tradeFeeRate, 10 ** 4), { alreadyDecimaled: true }),
    selected: i.id === userSelectedAmmConfigFeeOption?.id,
    creatable: !selectableAmmPoolIds?.includes(i.id)
  }))
  return (
    <Card
      className={twMerge(
        `p-6 mobile:py-4 mobile:px-2 rounded-3xl w-full border-1.5 border-[rgba(171,196,255,0.2)] bg-cyberpunk-card-bg shadow-cyberpunk-card`
      )}
      size="lg"
    >
      {/* left */}
      <div className="border-1.5 border-[#abc4ff40] rounded-xl p-3 mobile:p-2 mobile:mt-3">
        <div>
          <div>Select Tokens</div>
          <Row className="gap-2">
            <SelectTokenItem title="Base Token" onSelectToken={(token) => useConcentrated.setState({ coin1: token })} />
            <SelectTokenItem
              title="Quote Token"
              onSelectToken={(token) => useConcentrated.setState({ coin2: token })}
            />
          </Row>
        </div>
        <div>
          <div>Select Fee</div>
          <Row className="gap-4">
            {availableAmmConfigFeeOptionsWithCreatable?.map((i) => (
              <div
                key={i.id}
                className={`${i.creatable ? 'cursor-pointer' : 'opacity-50 pointer-events-none'} ${
                  i.selected ? 'border-1.5 border-[#abc4ff]' : ''
                }`}
                onClick={() => {
                  useConcentrated.setState({ userSelectedAmmConfigFeeOption: i.originalData })
                }}
              >
                <div>{toPercentString(toPercent(i.tradeFeeRate))}</div>
              </div>
            ))}
          </Row>
        </div>
      </div>

      {/* right */}
      <div className="border-1.5 border-[#abc4ff40] rounded-xl p-3 mobile:p-2 mobile:mt-3">
        <div>
          <div>Set Current Price</div>
          <Input
            onUserInput={(value) => {
              useConcentrated.setState({ userSettedCurrentPrice: value })
            }}
          />
        </div>
        {/* <div>
          <div>Select Fee</div>
          <Row>
            <div>ba</div>
            <div>la</div>
            <div>ba</div>
            <div>la</div>
          </Row>
        </div> */}
      </div>
    </Card>
  )
}

function SelectTokenItem({ title, onSelectToken }: { title?: string; onSelectToken?: (token: SplToken) => void }) {
  const [isSelectorOpen, setIsSelectorOpen] = useState(false)
  const [cachedToken, setCachedToken] = useState<SplToken>()
  return (
    <>
      <div className="bg-[#141041] rounded-xl py-4 px-8 cursor-pointer" onClick={() => setIsSelectorOpen(true)}>
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
