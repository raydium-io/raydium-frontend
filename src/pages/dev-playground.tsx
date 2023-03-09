import { useCallback, useEffect, useState } from 'react'

import { Fraction } from '@raydium-io/raydium-sdk'

import Button from '@/components/Button'
import PageLayout from '@/components/PageLayout'
import toUsdVolume from '@/functions/format/toUsdVolume'
import { lazyMap } from '@/functions/lazyMap'
import { div } from '@/functions/numberish/operations'
import toBN from '@/functions/numberish/toBN'
import { toString } from '@/functions/numberish/toString'
import useToggle from '@/hooks/useToggle'

import { RollingNumber } from '../components/RollingNumber'
import { VirtualBox } from '../components/VirtualBox'

/**
 * temporary create-market page
 */
export default function CreateMarketPage() {
  // you can uncomment these function to test lazymap
  // BNCompute()
  // SimpleCompute()
  // UpdateSimpleCompute()
  return (
    <PageLayout mobileBarTitle="Dev Playground" metaTitle="Dev Playground - Raydium">
      <div className="title text-2xl mobile:text-lg font-semibold justify-self-start text-white mb-4">Playground</div>
      <VirtualBoxExample />
      <NExample />
      {/* <LazymapTest /> // you can uncomment these function to test lazymap */}
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
      <VirtualBox observeWidth show={!vitualHidden} className="border-2 border-[#abc4ff] box-content">
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

function LazymapTest() {
  let count = 0
  const addNoiseTask = useCallback(async () => {
    const bnResult = await lazyMap({
      source: Array.from(Array(1000000).keys()),
      loopTaskName: `noise-${count++}`,
      loopFn: (num) => {
        return toBN(num).mul(toBN(100))
      },
      options: { priority: 0 }
    })

    // eslint-disable-next-line
    console.log('[lazymap]', bnResult)
  }, [])

  const addBNTask = useCallback(async () => {
    const bnResult = await lazyMap({
      source: Array.from(Array(1000).keys()),
      loopTaskName: 'BN compute',
      loopFn: (num) => {
        return toBN(num).mul(toBN(100))
      },
      options: { priority: 0 }
    })

    // eslint-disable-next-line
    console.log('[lazymap]', bnResult)
  }, [])

  const addSimpleTask = useCallback(async () => {
    const simpleResult = await lazyMap({
      source: Array.from(Array(10).keys()),
      loopTaskName: 'simple compute',
      loopFn: (num) => {
        return num + 1
      },
      options: { priority: 1 }
    })

    // eslint-disable-next-line
    console.log('[lazymap]', simpleResult)
  }, [])

  return (
    <div>
      <Button className="my-4" onClick={addNoiseTask}>
        Add noise
      </Button>
      <Button className="my-4" onClick={addBNTask}>
        Add complicated task
      </Button>
      <Button className="my-4" onClick={addSimpleTask}>
        Add simple task
      </Button>
    </div>
  )
}

function BNCompute() {
  useEffect(() => {
    const run = async () => {
      const bnResult = await lazyMap({
        source: Array.from(Array(1000000).keys()),
        loopTaskName: 'BN compute',
        loopFn: (num) => {
          return toBN(num).mul(toBN(100))
        },
        options: { priority: 0 }
      })

      // eslint-disable-next-line
      console.log('[lazymap]', bnResult)
    }
    run()
  }, [])
}

function SimpleCompute() {
  useEffect(() => {
    const run = async () => {
      const simpleResult = await lazyMap({
        source: Array.from(Array(10).keys()),
        loopTaskName: 'simple compute',
        loopFn: (num) => {
          return num + 1
        },
        options: { priority: 1 }
      })

      // eslint-disable-next-line
      console.log('[lazymap]', simpleResult)
    }
    run()
  }, [])
}

function UpdateSimpleCompute() {
  useEffect(() => {
    const run = async () => {
      const simpleResult = await lazyMap({
        source: Array.from(Array(20).keys()),
        loopTaskName: 'simple compute',
        loopFn: (num) => {
          return num + 1
        },
        options: { priority: 1 }
      })

      // eslint-disable-next-line
      console.log('[lazymap]', simpleResult)
    }
    run()
  }, [])
}
