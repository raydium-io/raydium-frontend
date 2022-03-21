import { routeTo } from '@/application/routeTools'
import PageLayout from '@/components/PageLayout'
import { useIsomorphicLayoutEffect } from '@/hooks/useIsomorphicLayoutEffect '

export default function RemoveLiquidityPage() {
  useIsomorphicLayoutEffect(() => {
    routeTo('/liquidity/add', ({ currentPageQuery }) => ({
      queryProps: {
        ...currentPageQuery,
        mode: 'removeLiquidity'
      }
    }))
  })
  return <PageLayout> </PageLayout>
}
