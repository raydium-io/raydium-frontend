import useConcentrated from '@/application/concentrated/useConcentrated'
import Button from '@/components/Button'
import Grid from '@/components/Grid'
import Icon from '@/components/Icon'
import Tooltip from '@/components/Tooltip'
import AprCalcDialog from '@/pageComponents/Concentrated/AprCalcDialog'
import { twMerge } from 'tailwind-merge'

export function ConcentratedModifyTooltipIcon({ iconClassName }: { iconClassName?: string }) {
  const aprCalcMode = useConcentrated((s) => s.aprCalcMode)
  return (
    <Tooltip>
      <Icon className={twMerge('ml-1 cursor-help', iconClassName)} size="sm" iconSrc="/icons/clmm-modify.svg" />
      <AprCalcDialog />
      <Tooltip.Panel className="max-w-[min(100vw,300px)]">
        <Grid className="grid-cols-2-auto items-center">
          <div className="text-sm text-white font-medium">
            {aprCalcMode === 'A' ? 'A Method' : aprCalcMode === 'B' ? 'B Method' : 'C Method'}
          </div>
          <Button
            className="justify-end text-link-color"
            type="text"
            onClick={() =>
              useConcentrated.setState((s) => ({
                aprCalcMode: s.aprCalcMode === 'B' ? 'C' : 'B'
              }))
            }
          >
            <Icon size="sm" iconSrc="/icons/msic-swap.svg" />
            Switch
          </Button>
          <div className="col-span-full text-xs text-[#abc4ff80]">
            This APR is calculated by Multiplier Method. You can swith to Leverage Method if you think that is more
            reasonable.
            <Button
              type="text"
              className="p-0 ml-2 text-link-color"
              onClick={() =>
                useConcentrated.setState({
                  isAprCalcPanelShown: true
                })
              }
            >
              Learn more
            </Button>
          </div>
        </Grid>
      </Tooltip.Panel>
    </Tooltip>
  )
}
