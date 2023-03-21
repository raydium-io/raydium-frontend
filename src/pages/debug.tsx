import useAppSettings from '@/application/common/useAppSettings'
import useNotification from '@/application/notification/useNotification'
import txDebugMigratePDA from '@/application/tempDebugTransactions/txAddLiquidity'
import Button from '@/components/Button'
import PageLayout from '@/components/PageLayout'
import { toString } from '@/functions/numberish/toString'
import { useState } from 'react'
import { RollingNumber } from '../components/RollingNumber'

/**
 * export some dev tools
 */
export default function DebugPage() {
  return (
    <PageLayout mobileBarTitle="Debug" metaTitle="Debug - Raydium">
      <div className="title text-2xl mobile:text-lg font-semibold justify-self-start text-white mb-4">Debug</div>
      <MigrateOldAccountButton />
    </PageLayout>
  )
}

function MigrateOldAccountButton() {
  const [isProcessing, setIsProcessing] = useState(false)
  const isApprovePanelShown = useAppSettings((s) => s.isApprovePanelShown)
  return (
    <div>
      <div className="text-[#abc4ff] mb-4">Migrate Old Account To PDA And Harvest Reward</div>
      <Button
        className="frosted-glass-teal"
        isLoading={isProcessing || isApprovePanelShown}
        onClick={() => {
          setIsProcessing(true)
          txDebugMigratePDA().finally(() => {
            setIsProcessing(false)
          })
        }}
      >
        Migrate
      </Button>
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
