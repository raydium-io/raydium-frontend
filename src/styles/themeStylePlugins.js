const plugin = require('tailwindcss/plugin')

exports.cyberpunkLightBorders = plugin(({ addUtilities }) => {
  const cyberpunkLightBorders = {
    '.cyberpunk-border': {
      borderColor: 'transparent',
      position: 'relative',
      '&::after': {
        content: "''",
        position: 'absolute',
        top: '0',
        right: '0',
        bottom: '0',
        left: '0',
        pointerEvents: 'none',
        overflow: 'hidden',
        background: 'linear-gradient(246deg, #da2eef 7.97%, #2b6aff 49.17%, #39d0d8 92.1%)',
        borderRadius: 'inherit',
        maskImage: `url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg'><rect width='100%' height='100%' fill='none' stroke='black' stroke-width='2'/></svg>")`
      }
    }
  }
  addUtilities(cyberpunkLightBorders, ['focus-within', 'hover', 'active'])

  const roundedValueMap = {
    '-sm': '0.125rem',
    '': '0.25rem',
    '-md': '0.375rem',
    '-lg': '0.5rem',
    '-xl': '0.75rem',
    '-2xl': '1rem',
    '-3xl': '1.25rem'
  }
  const resultMap = Object.fromEntries(
    Object.entries(roundedValueMap).map(([roundClass, roundedValue]) => [
      `.cyberpunk-border-rounded${roundClass}`,
      {
        '&::after': {
          maskImage: `url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg'><rect width='100%' height='100%' rx='${roundedValue}' fill='none' stroke='black' stroke-width='2'/></svg>")`
        }
      }
    ])
  )
  addUtilities(resultMap, ['focus-within', 'hover', 'active'])
})

exports.cyberpunkBgLight = plugin(({ addUtilities }) => {
  addUtilities(
    {
      '.cyberpunk-bg-light': {
        position: 'relative',
        '&::before': {
          content: "''",
          position: 'absolute',
          top: '-15px',
          right: '-35px',
          bottom: '-15px',
          left: '-35px',
          zIndex: '-1', // !!! is't parent node must have a new stacking context (like css isolation)
          pointerEvents: 'none',
          background:
            'radial-gradient(closest-side at 66.7%, #e300ff 100%, transparent 100%), radial-gradient(closest-side at 33.3%, #39d0d8 100%, transparent 100%)',
          filter: 'blur(90px)',
          opacity: '.45'
        }
      },
      '.cyberpunk-bg-light-simi': {
        position: 'relative',
        '&::before': {
          content: "''",
          position: 'absolute',
          top: '-15px',
          right: '-35px',
          bottom: '-15px',
          left: '-35px',
          zIndex: '-1',
          pointerEvents: 'none',
          background:
            'radial-gradient(closest-side at 66.7%, #da2eef8c, transparent), radial-gradient(closest-side at 33.3%, #39d0d88c, transparent)',
          filter: 'blur(90px)',
          opacity: '.45'
        }
      },
      '.cyberpunk-bg-light-acceleraytor': {
        position: 'relative',
        '&::before': {
          content: "''",
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: '442px',
          height: '442px',
          transform: 'translate(-50%, -50%)',
          zIndex: '-1',
          pointerEvents: 'none',
          background:
            'linear-gradient(221.5deg, #DA2EEF 16.15%, rgba(218, 46, 239, 0) 84.46%), radial-gradient(53.22% 53.22% at 93.67% 75.22%, rgba(218, 46, 239, 0.5) 0%, rgba(57, 208, 216, 0.5) 55.21%, rgba(84, 44, 238, 0.5) 100%), radial-gradient(63.44% 63.44% at 42.78% 105%, #39D0D8 0%, #542CEE 100%)',
          backgroundBlendMode: 'lighten, color-burn, normal',
          filter: 'blur(132px)',
          opacity: '.45'
        }
      }
    },
    ['hover', 'active']
  )
})

exports.glassStyle = plugin(({ addUtilities }) => {
  addUtilities({
    '.frosted-glass-smoke , .frosted-glass-lightsmoke , .frosted-glass-teal , .frosted-glass-skygray , .frosted-glass':
      {
        '--text-color': 'hsl(0, 0%, 100%)',
        '--border-color': 'hsl(0, 0%, 100%)',
        '--bg-board-color': 'hsl(0, 0%, 100%, 0.12)',
        '--bg-board-color-2': 'hsl(0, 0%, 100%, 0)',
        '--blur-size': '3px',

        position: 'relative',
        backdropFilter: 'blur(calc(var(--blur-size) * (-1 * var(--is-scrolling, 0) + 1)))',
        color: 'var(--text-color)',
        background:
          'linear-gradient(162deg, var(--bg-board-color) 28.7%, var(--bg-board-color-2, var(--bg-board-color)))',
        '&::before': {
          content: "''",
          position: 'absolute',
          inset: 0,
          zIndex: '-1',
          opacity: '0.7',
          background: 'transparent',
          borderRadius: 'inherit',
          boxShadow: 'inset 0 0 0 var(--border-line-width, 1.5px) var(--border-color)',
          maskImage: `radial-gradient(at -31% -58%, hsl(0, 0%, 0%, 0.5) 34%, transparent 60%),
        linear-gradient(to left, hsl(0, 0%, 0%, 0.2) 0%, transparent 13%),
        linear-gradient(hsl(0deg 0% 0% / 5%), hsl(0deg 0% 0% / 5%))`
        }
      },
    '.frosted-glass-teal': {
      '--text-color': 'hsl(183, 67%, 54%)',
      '--border-color': 'hsl(165, 87%, 65%)',
      '--bg-board-color': 'hsl(183, 67%, 54%, 0.2)',
      '--bg-board-color-2': 'hsl(183, 67%, 54%, 0)',
      '--blur-size': '6px'
    },
    '.frosted-glass-skygray': {
      '--text-color': '#ABC4FF',
      '--border-color': '#ABC4FF',
      '--bg-board-color': 'rgba(171, 196, 255, 0.2)',
      '--bg-board-color-2': 'rgba(171, 196, 255, 0)',
      '--blur-size': '6px'
    },
    '.frosted-glass-lightsmoke': {
      '--border-color': 'hsl(0, 0%, 100%)',
      '--bg-board-color': 'hsl(0, 0%, 100%, 0.08)',
      '--bg-board-color-2': 'hsl(0, 0%, 100%, 0)',
      '--text-color': 'hsl(0, 0%, 100%)',
      '--blur-size': '1.5px'
    },
    '.frosted-glass-smoke': {
      '--border-color': 'hsl(0, 0%, 100%)',
      '--bg-board-color': 'hsl(0, 0%, 100%, 0.12)',
      '--text-color': 'hsl(0, 0%, 100%)',
      '--blur-size': '2px'
    },
    '.no-frosted-blur': {
      '--blur-size': '0'
    }
  })

  addUtilities({
    '.home-rainbow-button-bg': {
      borderRadius: '12px',
      background: 'linear-gradient(245.22deg, #da2eef 35%, #2b6aff 65.17%, #39d0d8 92.1%)',
      backgroundPosition: '30% 50%',
      backgroundSize: '150% 150%',
      transition: '500ms',
      '&:hover': {
        backgroundPosition: '99% 50%'
      }
    }
  })
})

// TODO
// exports.coinRotateLoop = plugin(({ addUtilities }) => {
//   addUtilities({
//     '.swap-coin': {
//       position: 'relative',
//       animation: 'rotate-y-infinite 2s infinite',
//       animationDelay: 'var(--delay, 0)',
//       transformStyle: 'preserve-3d',
//       '.line-group': {
//         position: 'absolute',
//         top: '0',
//         right: '0',
//         bottom: '0',
//         left: '0',
//         transformStyle: 'inherit',
//         '.line-out': {
//           top: '50%',
//           position: 'absolute',
//           left: '50%',
//           width: '50%',
//           transformOrigin: 'left',
//           transformStyle: 'inherit'
//         },
//         '.line-inner': {
//           position: 'absolute',
//           left: '100%',
//           backgroundColor: 'var(--ground-color-dark-solid)',
//           transform: 'translateY(-50%) translateX(-64%) rotateY(90deg)',
//           width: '6px',
//           height: '13px',
//           border: '1px solid rgba(255, 255, 255, 0.5)',
//           borderLeft: 'none',
//           borderRight: 'none'
//         }

//       }
//     }
//   })
// })
