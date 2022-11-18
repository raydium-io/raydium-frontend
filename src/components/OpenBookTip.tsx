import Image from '@/components/Image'
import Tooltip from '@/components/Tooltip'

export function OpenBookTip() {
  return (
    <Tooltip>
      <div
        style={{
          background: 'linear-gradient(107.55deg, rgba(29, 81, 203, 0.7) 10.04%, rgba(43, 106, 255, 0.1) 109.75%)',
          borderRadius: '4px',
          transform: 'matrix(0.99, 0, -0.14, 1, 0, 0)',
          width: '110.89px',
          height: '20.19px',
          position: 'relative'
        }}
      >
        <Image
          // className={`h-8 w-8 rounded-full overflow-hidden `}
          src="/coins/open-book.svg"
          fallbackSrc="/coins/unknown.svg"
          style={{
            position: 'absolute',
            zIndex: 100,
            opacity: 20,
            left: '6.96%',
            // right: '43.49%',
            top: '30%',
            bottom: '31.69%'
          }}
        />
        <div
          style={{
            fontFamily: 'Arial',
            fontStyle: 'normal',
            fontWeight: 700,
            fontSize: '10px',
            lineHeight: '11px',
            color: '#fff',
            display: 'inline-block',
            position: 'absolute',
            left: '35.97%',
            // right: '-45.23%',
            top: '20%',
            bottom: '23.73%'
          }}
        >
          OpenBook
        </div>
      </div>
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
