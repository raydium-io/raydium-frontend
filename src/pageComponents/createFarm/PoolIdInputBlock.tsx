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
import { isValidePublicKey } from '@/functions/judgers/dateType'
import { useClickOutside } from '@/hooks/useClickOutside'
import { LiquidityPoolJsonInfo } from '@raydium-io/raydium-sdk'
import { RefObject, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'

export interface PoolIdInputBlockHandle {
  validate?: () => void
  turnOffValidation?: () => void
}

export function PoolIdInputBlock({
  componentRef,
  onInputValidate
}: {
  componentRef?: RefObject<any>
  onInputValidate?: (result: boolean) => void
}) {
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
      Object.assign({ ...pool }, {
        label: pool.id,
        // searchText: `${tokens[pool.baseMint]?.symbol} ${tokens[pool.quoteMint]?.symbol} ${pool.id}`
        searchText: (i) => [
          { text: i.id, entirely: true },
          { text: i.baseMint, entirely: true }, // Input Auto complete result sort setting
          { text: i.quoteMint, entirely: true },
          tokens[i.baseMint]?.symbol,
          tokens[i.quoteMint]?.symbol
        ]
      } as AutoCompleteCandidateItem<LiquidityPoolJsonInfo>)
    )

  // state for validate
  const [inputValue, setInputValue] = useState<string>()
  const [isInit, setIsInit] = useState(() => !inputValue)
  const [isInputing, setIsInputing] = useState(false) // true for don't pop valid result immediately
  const inputCardRef = useRef<HTMLElement>(null)

  useEffect(() => {
    inputValue && setIsInit(false)
  }, [inputValue])

  useEffect(() => {
    const result = Boolean(selectedPool && inputValue)
    onInputValidate?.(result)
  }, [inputValue])

  const validate = () => {
    setIsInputing(false)
  }
  const turnOffValidation = () => {
    setIsInputing(true)
  }
  useClickOutside(inputCardRef, {
    onBlurToOutside: validate
  })

  useImperativeHandle<any, PoolIdInputBlockHandle>(componentRef, () => ({
    validate,
    turnOffValidation
  }))

  return (
    <Card
      className="p-4 mobile:px-2 bg-cyberpunk-card-bg border-1.5 border-[#abc4ff1a]"
      size="lg"
      domRef={inputCardRef}
    >
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
          useCreateFarms.setState({ poolId: candidatedPoolId })
        }}
        onDangerousValueChange={(v) => {
          if (!v) useCreateFarms.setState({ poolId: undefined })
          if (isValidePublicKey(v)) useCreateFarms.setState({ poolId: v })
          setInputValue(v)
        }}
        onUserInput={() => {
          setIsInit(false)
          setIsInputing(true)
        }}
        onBlur={() => {
          setIsInputing(false)
        }}
      />

      <FadeInStable show={!isInputing && !isInit}>
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
              <div className="text-[#DA2EEF] text-sm font-medium">
                {inputValue ? "Can't find pool" : 'You need to select one pool'}
              </div>
            </>
          )}
        </Row>
      </FadeInStable>
    </Card>
  )
}
