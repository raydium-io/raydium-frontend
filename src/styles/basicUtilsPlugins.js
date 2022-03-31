const plugin = require('tailwindcss/plugin')

exports.ibasic = plugin(({ addUtilities }) => {
  addUtilities({
    '.no-native-scrollbar': {
      '&::-webkit-scrollbar': {
        display: 'none'
      }
    },
    'scrollbar-width-thin': {
      '&::-webkit-scrollbar': {
        width: '4px'
      }
    }
  })

  addUtilities({
    '.grid-area-a': {
      gridArea: 'a'
    },
    '.grid-area-b': {
      gridArea: 'b'
    },
    '.grid-area-c': {
      gridArea: 'c'
    },
    '.grid-area-d': {
      gridArea: 'd'
    },
    '.grid-area-e': {
      gridArea: 'e'
    },
    '.grid-area-f': {
      gridArea: 'f'
    }
  })
})

// it means a mix by other utils
exports.imix = plugin(({ addUtilities, addBase }) => {
  addUtilities({
    '.flex-container': {
      display: 'flex',
      flexDirection: 'column',
      '& > *': {
        flexShrink: '0'
      }
    }
  })

  addUtilities({
    '.clickable': {
      cursor: 'pointer',
      transition: '175ms',
      '&:active': {
        transform: 'scale(0.95)'
      }
    },
    '.clickable-filter-effect': {
      transition: '175ms',
      '&:hover': {
        filter: 'brightness(.95)',
        backdropFilter: 'brightness(.95)'
      },
      '&:active': {
        filter: 'brightness(.9)',
        backdropFilter: 'brightness(.9)'
      }
    },
    '.clickable-mask-rounded-full, .clickable-mask-offset-2, .clickable-mask-offset-3': {
      position: 'relative',
      '&::before': {
        content: "''",
        position: 'absolute',
        zIndex: '-1',
        top: '-8px',
        right: '-8px',
        bottom: '-8px',
        left: '-8px',
        cursor: 'pointer',
        borderRadius: '8px'
      },
      '&:hover::before': {
        background: 'rgba(0, 0, 0, 0.2)'
      },
      '&:active::before': {
        background: 'rgba(0, 0, 0, 0.3)'
      }
    },
    '.clickable-filter-effect-3': {
      '&::before': {
        borderRadius: '12px'
      }
    },
    '.clickable-mask-rounded-full': {
      '&::before': {
        borderRadius: '9999px'
      }
    },
    '.no-clicable-transform-effect': {
      '&:active': { transform: 'none' }
    },
    '.not-clickable': {
      cursor: 'not-allowed',
      pointerEvents: 'none',
      opacity: '0.5',
      '&:active': { all: 'none' },
      '&:hover': { all: 'none' }
    }
  })

  addUtilities({
    /* make grid child collapse each other **/
    '.grid-cover-container': {
      display: 'grid',
      placeItems: 'center',
      '> *': {
        gridArea: '1 / 1',
        overflow: 'auto'
      }
    }
  })

  addUtilities({
    '.grid-child-center': {
      display: 'grid',
      justifyItems: 'center',
      alignItems: 'center',
      gridTemplateColums: '1fr',
      textAlign: 'center',
      justifyContent: 'center'
    }
  })

  // self-pointer-events-none
  addBase({
    '.self-pointer-events-none': {
      pointerEvents: 'none',
      '*': {
        pointerEvents: 'auto'
      }
    }
  })

  addUtilities({
    '.scroll-boundary-mask': {
      '--to-top-boundary': 'min(calc(var(--scroll-top, 0) / var(--scroll-height, 1) * 100%), 15%)',
      '--to-bottom-boundary':
        'min(calc((var(--scroll-height, 1) - var(--scroll-top, 0) - var(--client-height, 1)) / var(--scroll-height, 1) * 100%), 15%)',
      mask: 'linear-gradient(to bottom, rgba(0, 0, 0, .2), rgba(0, 0, 0, 1) var(--to-top-boundary), rgba(0, 0, 0, 1) calc(100% - var(--to-bottom-boundary)), rgba(0, 0, 0, .2))'
    }
  })

  addUtilities({
    '.grid-gap-board': {
      clipPath: 'inset(1px)',
      '*': {
        border: '1px solid #abc4ff1a'
      }
    }
  })
})
