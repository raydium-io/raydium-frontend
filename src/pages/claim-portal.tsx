import useAppSettings from '@/application/common/useAppSettings'
import AutoBox from '@/components/AutoBox'
import Link from '@/components/Link'
import PageLayout from '@/components/PageLayout'

/**
 * temporary pay money to user for be hacked by hacker page
 */
export default function CompensationPage() {
  const isMobile = useAppSettings((s) => s.isMobile)

  return (
    <PageLayout mobileBarTitle="Claim portal" metaTitle="Claim portal - Raydium" contentButtonPaddingShorter>
      <AutoBox is={isMobile ? 'Col' : 'Row'} className="items-center justify-between gap-4">
        <div>
          <div className="title text-2xl mobile:text-lg font-bold justify-self-start text-white mb-4">Claim Portal</div>
          <div className="text-[#abc4ff] mobile:text-xs mb-4 space-y-4">
            <div>This portal is for claiming assets from pools affected by the December 16th exploit.</div>
            <div>
              If you had LP positions that were affected, details can be viewed below and assets claimed. For full info,{' '}
              <Link href="https://docs.raydium.io/raydium/updates/claim-portal">click here</Link>.
            </div>
          </div>
        </div>
      </AutoBox>
    </PageLayout>
  )
}
