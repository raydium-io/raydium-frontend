import Card from '@/components/Card'
import PageLayout from '@/components/PageLayout'
import SetpIndicator from '@/components/SetpIndicator'

export default function CreateFarmPage() {
  return (
    <PageLayout metaTitle="Farms - Raydium">
      <div className="self-center w-[min(456px,90vw)]">
        <div className="pb-8 text-2xl mobile:text-lg font-semibold justify-self-start text-white">Create Farm</div>
        <Card
          className="p-8 mobile:p-4 flex flex-col shadow-xl rounded-3xl border-1.5 border-[rgba(171,196,255,0.2)] overflow-y-auto overflow-x-hidden"
          size="lg"
          style={{
            background:
              'linear-gradient(140.14deg, rgba(0, 182, 191, 0.15) 0%, rgba(27, 22, 89, 0.1) 86.61%), linear-gradient(321.82deg, #18134D 0%, #1B1659 100%)',
            boxShadow: '0px 8px 48px rgba(171, 196, 255, 0.12)'
          }}
        >
          {/* step indicator */}
          <SetpIndicator
            stepInfos={[
              {
                stepNumber: 1,
                stepContent: 'Import Serum Market ID'
              },
              {
                stepNumber: 2,
                stepContent: 'Price & Initial Liquidity'
              },
              {
                stepNumber: 3,
                stepContent: 'Pool Created'
              }
            ]}
          ></SetpIndicator>
        </Card>
      </div>
    </PageLayout>
  )
}
