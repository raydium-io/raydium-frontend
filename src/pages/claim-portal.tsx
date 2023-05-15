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
            <div>
              The Claim Portal was made available for users to view information about liquidity positions that were
              affected by the December 16, 2022 exploit and withdraw assets for compensation accordingly.
            </div>
            <div>
              Claims were processed in several phases and split between specific pools. The compensation period began on
              January 5, 2023 12:00 UTC and was originally set to close on March 5th. The period for claims was extended
              serval times until the Claim Portal ultimately closed on May 14, 2023 at 23:59 UTC.
            </div>
            <div>
              For full info on the claim process and relevant updates,{' '}
              <Link href="https://docs.raydium.io/raydium/updates/claim-portal">click here</Link>.
            </div>
          </div>
        </div>
      </AutoBox>
    </PageLayout>
  )
}
