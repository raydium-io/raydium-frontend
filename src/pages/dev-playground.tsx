import Button from '@/components/Button'
import PageLayout from '@/components/PageLayout'
import useToggle from '@/hooks/useToggle'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { VirtualBox } from '../components/VirtualBox'

/**
 * temporary create-market page
 */
export default function CreateMarketPage() {
  return (
    <PageLayout mobileBarTitle="Dev Playground" metaTitle="Dev Playground - Raydium">
      <div className="title text-2xl mobile:text-lg font-semibold justify-self-start text-white mb-4">Playground</div>
      <VirtualBoxExample />
    </PageLayout>
  )
}

function VirtualBoxExample() {
  const [vitualHidden, { toggle }] = useToggle()
  const [innerHeight, setInnerHeight] = useState(96)

  return (
    <div>
      <Button className="my-4" onClick={toggle}>
        {vitualHidden ? 'hidden' : 'shown'}
      </Button>
      <Button
        className="my-4"
        onClick={() => {
          setInnerHeight((n) => n + 8)
        }}
      >
        height: {innerHeight}
      </Button>
      <VirtualBox show={!vitualHidden} className="border-2 border-[#abc4ff] box-content">
        {(detectRef) => (
          <div
            ref={detectRef}
            className="h-24 w-48 bg-dark-blue grid place-content-center"
            style={{ height: innerHeight }}
          >
            hello world
          </div>
        )}
      </VirtualBox>
    </div>
  )
}
