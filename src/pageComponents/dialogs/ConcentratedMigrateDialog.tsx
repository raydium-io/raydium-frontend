import useConcentrated from '@/application/concentrated/useConcentrated'
import { HydratedFarmInfo } from '@/application/farms/type'
import { HydratedLiquidityInfo } from '@/application/liquidity/type'
import Card from '@/components/Card'
import ResponsiveDialogDrawer from '@/components/ResponsiveDialogDrawer'
import useToggle from '@/hooks/useToggle'
import { FarmPoolJsonInfo } from '@raydium-io/raydium-sdk'

export default function ConcentratedMigrateDialog({
  info,
  open,
  onClose
}: {
  info: HydratedLiquidityInfo | HydratedFarmInfo
  open: boolean
  onClose: () => void
}) {
  const [canShowMigrateDetail, { on, off }] = useToggle()

  return (
    <ResponsiveDialogDrawer placement="from-bottom" open={open} onClose={onClose}>
      {({ close: closeDialog }) => (
        <Card
          className="p-8 mobile:p-4 pb-2 rounded-3xl mobile:rounded-lg w-[min(912px,90vw)] max-h-[80vh] overflow-auto mobile:w-full border-1.5 border-[rgba(171,196,255,0.2)] bg-cyberpunk-card-bg shadow-cyberpunk-card"
          size="lg"
        >
          Hello World
        </Card>
      )}
    </ResponsiveDialogDrawer>
  )
}
