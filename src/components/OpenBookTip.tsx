import Image from '@/components/Image'
import Tooltip from '@/components/Tooltip'

export function OpenBookTip() {
  return (
    <Tooltip>
      <Image src="/coins/open-book-tip.svg" fallbackSrc="/coins/unknown.svg" />
      <Tooltip.Panel>
        <div className="max-w-[300px]">
          This pool leverages liquidity to market make on the OpenBook central limit order book.{' '}
          <a href="https://docs.raydium.io/raydium/updates/integration-with-openbook" style={{ color: '#39D0D8' }}>
            Learn more
          </a>
        </div>
      </Tooltip.Panel>
    </Tooltip>
  )
}
