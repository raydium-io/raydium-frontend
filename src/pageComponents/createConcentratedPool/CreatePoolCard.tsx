import useConcentrated from '@/application/concentrated/useConcentrated'
import { SplToken } from '@/application/token/type'
import Card from '@/components/Card'
import CoinAvatar from '@/components/CoinAvatar'
import Grid from '@/components/Grid'
import Icon from '@/components/Icon'
import InputBox from '@/components/InputBox'
import Row from '@/components/Row'
import { useState } from 'react'
import { twMerge } from 'tailwind-merge'
import TokenSelectorDialog from '../dialogs/TokenSelectorDialog'
import { ConcentratedFeeSwitcher } from './ConcentratedFeeSwitcher'

export function CreatePoolCard() {
  return (
    <Card
      className={twMerge(
        `grid grid-cols-2-auto gap-4 p-6 mobile:py-4 mobile:px-2 rounded-3xl w-full border-1.5 border-[rgba(171,196,255,0.2)] bg-cyberpunk-card-bg shadow-cyberpunk-card`
      )}
      size="lg"
    >
      {/* left */}
      <div className="border-1.5 border-[#abc4ff40] rounded-xl p-3 mobile:p-2 mobile:mt-3">
        <div className="mb-8">
          <div className="font-medium text-[#abc4ff] my-1">Select Tokens</div>
          <Grid className="grid-cols-2 gap-4">
            <SelectTokenItem title="Base Token" onSelectToken={(token) => useConcentrated.setState({ coin1: token })} />
            <SelectTokenItem
              title="Quote Token"
              onSelectToken={(token) => useConcentrated.setState({ coin2: token })}
            />
          </Grid>
        </div>

        <div>
          <div className="font-medium text-[#abc4ff] my-1">Select Fee</div>
          <ConcentratedFeeSwitcher />
        </div>
      </div>

      {/* right */}
      <div className="border-1.5 border-[#abc4ff40] rounded-xl p-3 mobile:p-2 mobile:mt-3">
        <div>
          <div className="font-medium text-[#abc4ff] my-1">Set Current Price</div>
          <InputBox
            decimalMode
            onUserInput={(value) => {
              useConcentrated.setState({ userSettedCurrentPrice: value })
            }}
          />
        </div>
      </div>
    </Card>
  )
}

function SelectTokenItem({ title, onSelectToken }: { title?: string; onSelectToken?: (token: SplToken) => void }) {
  const [isSelectorOpen, setIsSelectorOpen] = useState(false)
  const [cachedToken, setCachedToken] = useState<SplToken>()
  return (
    <>
      <Grid
        className="bg-[#141041] rounded-xl py-2 cursor-pointer place-content-center"
        onClick={() => setIsSelectorOpen(true)}
      >
        {cachedToken ? (
          <div>
            <div className="text-xs font-medium text-[#abc4ff80] my-1 text-center">{title}</div>
            <Row className="items-center gap-2">
              <CoinAvatar token={cachedToken} />
              <div className="text-[#abc4ff] font-medium">{cachedToken.symbol ?? ''}</div>
              <Icon size="sm" className="text-[#abc4ff]" heroIconName="chevron-down" />
            </Row>
          </div>
        ) : (
          <div>{title}</div>
        )}
      </Grid>
      <TokenSelectorDialog
        open={isSelectorOpen}
        onClose={() => {
          setIsSelectorOpen(false)
        }}
        onSelectToken={(token) => {
          onSelectToken?.(token)
          setCachedToken(token)
        }}
      />
    </>
  )
}
