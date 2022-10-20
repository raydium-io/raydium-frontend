import useConcentrated from '@/application/concentrated/useConcentrated'
import Button from '@/components/Button'
import Grid from '@/components/Grid'
import Icon from '@/components/Icon'
import Tooltip from '@/components/Tooltip'
import AprCalcDialog from '@/pageComponents/Concentrated/AprCalcDialog'
import { twMerge } from 'tailwind-merge'

export function ConcentratedModifyTooltipIcon({ iconClassName }: { iconClassName?: string }) {
  const aprCalcMode = useConcentrated((s) => s.aprCalcMode)
  const text = {
    D: {
      title: 'Delta Method',
      description:
        'Estimated APR is calculated by the Delta Method. Click the ‘D’ icon to switch to the Multiplier Method or'
    },
    M: {
      title: 'Multiplier Method',
      description:
        'Estimated APR is calculated by the Multiplier Method. Click the ‘M’ icon to switch to the Delta Method or'
    }
  }
  return (
    <Tooltip>
      <Icon
        className={twMerge('ml-1 cursor-help', iconClassName)}
        size="sm"
        iconSrc={aprCalcMode === 'D' ? '/icons/clmm-modify-d.svg' : '/icons/clmm-modify-m.svg'}
      />
      <AprCalcDialog />
      <Tooltip.Panel className="max-w-[min(100vw,300px)]">
        {(handlers) => (
          <Grid className="grid-cols-2-auto items-center gap-y-2">
            <div className="text-sm text-white font-medium">{aprCalcMode === 'D' ? text.D.title : text.M.title}</div>
            <Button
              className="justify-end text-link-color p-0 no-clicable-transform-effect"
              type="text"
              onClick={() =>
                useConcentrated.setState((s) => ({
                  aprCalcMode: s.aprCalcMode === 'D' ? 'C' : 'D'
                }))
              }
            >
              <Icon size="sm" heroIconName="x-switch" />
              Switch
            </Button>
            <div className="col-span-full text-xs text-[#abc4ff80]">
              {aprCalcMode === 'D' ? text.D.description : text.M.description}
              <Button
                type="text"
                className="p-0 ml-2 text-link-color"
                onClick={() => {
                  useConcentrated.setState({
                    isAprCalcPanelShown: true
                  })
                  handlers?.close()
                }}
              >
                Learn more
              </Button>
            </div>
          </Grid>
        )}
      </Tooltip.Panel>
    </Tooltip>
  )
}
