import Button from '@/components/Button'
import PageLayout from '@/components/PageLayout'
import toUsdVolume from '@/functions/format/toUsdVolume'
import { div } from '@/functions/numberish/operations'
import { toString } from '@/functions/numberish/toString'
import useToggle from '@/hooks/useToggle'
import { Fraction } from '@raydium-io/raydium-sdk'
import { useState } from 'react'
import { VirtualBox } from '../components/VirtualBox'
import { RollingNumber } from '../components/RollingNumber'
import CoinInputBox from '@/components/CoinInputBox'
import DecimalInput from '@/components/DecimalInput'

/**
 * temporary create-market page
 */
export default function CreateMarketPage() {
  return (
    <PageLayout mobileBarTitle="Dev Playground" metaTitle="Dev Playground - Raydium">
      <div className="title text-2xl mobile:text-lg font-semibold justify-self-start text-white mb-4">Playground</div>
      <InputExample />
    </PageLayout>
  )
}

function InputExample() {
  const [vitualHidden, { toggle }] = useToggle()
  const [innerHeight, setInnerHeight] = useState(96)

  return (
    <div className="border">
      <DecimalInput />
    </div>
  )
}

function NExample() {
  const strings = ['133444.444', '28.121233', '22']
  const [currentIndex, setCurrentIndex] = useState(0)
  return (
    <div>
      <Button
        className="my-4"
        onClick={() => {
          setCurrentIndex((idx) => (idx + 1) % strings.length)
        }}
      >
        change n
      </Button>
      <RollingNumber n={strings[currentIndex]} format={(n) => toString(n)} />
    </div>
  )
}
