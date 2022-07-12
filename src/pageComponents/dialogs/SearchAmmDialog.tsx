import React, { useRef } from 'react'
import { twMerge } from 'tailwind-merge'

import useLiquidity from '@/application/liquidity/useLiquidity'
import Button, { ButtonHandle } from '@/components/Button'
import Card from '@/components/Card'
import Dialog from '@/components/Dialog'
import Icon from '@/components/Icon'
import Row from '@/components/Row'
import useToken from '@/application/token/useToken'
import assert from '@/functions/assert'
import { isValidPublicKey } from '@/functions/judgers/dateType'
import { findTokenMintByAmmId, findTokenMintByMarketId } from '@/application/liquidity/miscToolFns'
import useNotification from '@/application/notification/useNotification'
import InputBox from '../../components/InputBox'

export function SearchAmmDialog({
  open,
  onClose,
  className
}: {
  open: boolean
  onClose: () => void
  className?: string
}) {
  const [searchText, setSearchText] = React.useState('')
  const buttonComponentRef = useRef<ButtonHandle>()

  const parseTokensFromSearchInput = async (currentValue: string) => {
    try {
      const { getToken } = useToken.getState()
      assert(isValidPublicKey(currentValue), 'invalid public key')

      const ammFindResult = findTokenMintByAmmId(currentValue.trim())
      if (ammFindResult) {
        useLiquidity.setState({
          coin1: getToken(ammFindResult.base),
          coin2: getToken(ammFindResult.quote),
          ammId: currentValue.trim()
        })
        return
      }

      const marketFindResult = await findTokenMintByMarketId(currentValue.trim())
      if (marketFindResult) {
        useLiquidity.setState({ coin1: getToken(marketFindResult.base), coin2: getToken(marketFindResult.quote) })
        return
      }

      throw new Error(`fail to extract info throungh this AMMId or MarketId`)
    } catch (err) {
      const { logError } = useNotification.getState()
      logError(String(err))
      throw err
    }
  }

  return (
    <Dialog open={open} onClose={onClose}>
      {({ close: closeDialog }) => (
        <Card
          className={twMerge(
            'backdrop-filter backdrop-blur-xl p-8 rounded-3xl w-[min(456px,90vw)] border-1.5 border-[rgba(171,196,255,0.2)] bg-cyberpunk-card-bg shadow-cyberpunk-card',
            className
          )}
          size="lg"
        >
          <Row className="justify-between items-center mb-6">
            <div className="text-xl font-semibold text-white">Pool Search</div>
            <Icon className="text-[#ABC4FF] cursor-pointer" heroIconName="x" onClick={closeDialog} />
          </Row>

          <InputBox
            className="mb-6"
            label="AMM ID or Serum market ID"
            onUserInput={setSearchText}
            onEnter={(currentValue) => {
              parseTokensFromSearchInput(currentValue)
                .then(() => closeDialog())
                .catch(() => {})
            }}
          />

          <Row className="flex-col gap-1">
            <Button
              className="frosted-glass frosted-glass-teal"
              componentRef={buttonComponentRef}
              onClick={() => {
                parseTokensFromSearchInput(searchText)
                  .then(() => closeDialog())
                  .catch(() => {})
              }}
            >
              Search
            </Button>
          </Row>
        </Card>
      )}
    </Dialog>
  )
}
