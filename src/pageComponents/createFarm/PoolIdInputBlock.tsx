import useCreateFarms from '@/application/createFarm/useCreateFarm'
import useLiquidity from '@/application/liquidity/useLiquidity'
import { usePools } from '@/application/pools/usePools'
import useToken from '@/application/token/useToken'
import { AddressItem } from '@/components/AddressItem'
import AutoComplete, { AutoCompleteCandidateItem } from '@/components/AutoComplete'
import Card from '@/components/Card'
import CoinAvatarPair from '@/components/CoinAvatarPair'
import FadeInStable from '@/components/FadeIn'
import Icon from '@/components/Icon'
import Row from '@/components/Row'
import listToMap from '@/functions/format/listToMap'
import toUsdVolume from '@/functions/format/toUsdVolume'
import { useMemo, useState } from 'react'

export function PoolIdInputBlock() {
  const poolId = useCreateFarms((s) => s.poolId)
  const pairInfos = usePools((s) => s.hydratedInfos)
  const liquidityPoolJsons = useLiquidity((s) => s.jsonInfos)
  const tokens = useToken((s) => s.tokens)

  const liquidityPoolMap = useMemo(() => listToMap(liquidityPoolJsons, (s) => s.id), [liquidityPoolJsons])
  const pairInfoMap = useMemo(() => listToMap(pairInfos, (s) => s.ammId), [pairInfos])

  const selectedPool = liquidityPoolJsons.find((i) => i.id === poolId)
  const selectedPoolPairInfo = pairInfos.find((i) => i.ammId === poolId)

  const candidates = liquidityPoolJsons
    .filter((p) => tokens[p.baseMint] && tokens[p.quoteMint])
    .map((pool) =>
      Object.assign(pool, {
        label: pool.id,
        searchText: `${tokens[pool.baseMint]?.symbol} ${tokens[pool.quoteMint]?.symbol} ${pool.id}`
      } as AutoCompleteCandidateItem)
    )

  const [inputValue, setInputValue] = useState<string>()
  const [isInputing, setIsInputing] = useState(false)
  return (
    <Card className="p-4 mobile:px-2 bg-cyberpunk-card-bg border-1.5 border-[#abc4ff1a]" size="lg">
      <AutoComplete
        candidates={candidates}
        value={selectedPool?.id}
        className="p-4 py-3 gap-2 bg-[#141041] rounded-xl min-w-[7em]"
        inputClassName="font-medium mobile:text-xs text-[#abc4ff] placeholder-[#abc4Ff80]"
        suffix={<Icon heroIconName="search" className="text-[rgba(196,214,255,0.5)]" />}
        placeholder="Search for a pool or paste AMM ID"
        renderCandidateItem={({ candidate, isSelected }) => (
          <Row className={`py-3 px-4 items-center gap-2 ${isSelected ? 'backdrop-brightness-50' : ''}`}>
            <CoinAvatarPair token1={tokens[candidate.baseMint]} token2={tokens[candidate.quoteMint]} />
            <div className="text-[#abc4ff] font-medium">
              {tokens[candidate.baseMint]?.symbol}-{tokens[candidate.quoteMint]?.symbol}
            </div>
            {pairInfoMap[candidate.id] ? (
              <div className="text-[#abc4ff80] text-sm font-medium">
                {toUsdVolume(pairInfoMap[candidate.id].liquidity, { decimalPlace: 0 })}
              </div>
            ) : null}
            <AddressItem canCopy={false} showDigitCount={8} className="text-[#abc4ff80] text-xs ml-auto">
              {candidate.id}
            </AddressItem>
          </Row>
        )}
        onSelectCandiateItem={({ selected }) => {
          setIsInputing(false)
          useCreateFarms.setState({ poolId: selected.id })
        }}
        onBlurMatchCandiateFailed={({ text: candidatedPoolId }) => {
          const matchedPoolId = liquidityPoolJsons.find((i) => i.id === candidatedPoolId)?.id
          useCreateFarms.setState({ poolId: matchedPoolId })
        }}
        onDangerousValueChange={(v) => {
          setInputValue(v)
        }}
        onUserInput={() => {
          setIsInputing(true)
        }}
        onBlur={() => {
          setIsInputing(false)
        }}
      />

      <FadeInStable show={inputValue && !isInputing}>
        <Row className="items-center px-4 pt-2 gap-2">
          {selectedPool ? (
            <>
              <CoinAvatarPair token1={tokens[selectedPool.baseMint]} token2={tokens[selectedPool.quoteMint]} />
              <div className="text-[#abc4ff] text-base font-medium">
                {tokens[selectedPool.baseMint]?.symbol} - {tokens[selectedPool.quoteMint]?.symbol}
              </div>
              {selectedPoolPairInfo ? (
                <div className="text-[#abc4ff80] text-sm ml-auto font-medium">
                  Liquidity: {toUsdVolume(selectedPoolPairInfo.liquidity, { decimalPlace: 0 })}
                </div>
              ) : null}
            </>
          ) : (
            <>
              <Icon size="smi" heroIconName="x-circle" className="text-[#DA2EEF]" />
              <div className="text-[#DA2EEF] text-xs font-medium">Can't find pool</div>
            </>
          )}
        </Row>
      </FadeInStable>
    </Card>
  )
}
