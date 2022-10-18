const plugin = require('tailwindcss/plugin')

exports.ibasic = plugin(({ addUtilities }) => {
  addUtilities({
    '.no-native-scrollbar': {
      '&::-webkit-scrollbar': {
        display: 'none'
      }
    },
    '.scrollbar-width-thin': {
      '&::-webkit-scrollbar': {
        width: '4px'
      },
      '&::-webkit-scrollbar-thumb': {
        background: '#ABC4FF80'
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

  // self-pointer-events-none
  addUtilities({
    '.self-pointer-events-none': {
      pointerEvents: 'none',
      '*': {
        pointerEvents: 'auto'
      }
    },
    '.pointer-events-none-entirely': {
      pointerEvents: 'none',
      '*': {
        pointerEvents: 'none'
      }
    }
  })

  addUtilities({
    '.clickable': {
      cursor: 'pointer',
      transition: '175ms',
      '&:active': {
        transform: 'scale(0.97)'
      }
    },
    '.clickable-no-transform': {
      cursor: 'pointer'
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
    '.clickable-opacity-effect': {
      transition: '175ms',
      opacity: 0.9,
      '&:active': { opacity: 1 },
      '&:hover': { opacity: 1 }
    },
    '.not-clickable-with-disallowed, .no-clicable-transform-effect': {
      '&:active': { transform: 'none' }
    },
    '.not-selectable, .not-clickable': {
      pointerEvents: 'none',
      cursor: 'default',
      opacity: '0.3',
      '&:active': { all: 'none' },
      '&:hover': { all: 'none' }
    },
    '.not-clickable-with-disallowed': {
      cursor: 'not-allowed',
      opacity: '0.3',
      transform: 'none',
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

  addUtilities({
    '.scroll-boundary-mask': {
      '--to-top-boundary': 'min(calc(var(--scroll-top, 0) / var(--scroll-height, 1) * 100%), 15%)',
      '--to-bottom-boundary':
        'min(calc((var(--scroll-height, 1) - var(--scroll-top, 0) - var(--client-height, 1)) / var(--scroll-height, 1) * 100%), 15%)',
      mask: 'linear-gradient(to bottom, rgba(0, 0, 0, .2), rgba(0, 0, 0, 1) var(--to-top-boundary), rgba(0, 0, 0, 1) calc(100% - var(--to-bottom-boundary)), rgba(0, 0, 0, .2))'
    }
  })

  addUtilities({
    '.gap-board': {
      clipPath: 'inset(1px)',
      '> *': {
        border: '1px solid #abc4ff1a'
      }
    },
    '.clip-insert-1': {
      clipPath: 'inset(4px)',
      margin: '-4px'
    },
    '.clip-insert-2': {
      clipPath: 'inset(8px)',
      margin: '-8px'
    },
    '.clip-insert-4': {
      clipPath: 'inset(16px)',
      margin: '-16px'
    }
  })

  addUtilities({
    '.cube': {
      '-webkit-backface-visibility': 'hidden',
      '-moz-backface-visibility': 'hidden',
      '-ms-backface-visibility': 'hidden',
      'backface-visibility': 'hidden',

      '-webkit-perspective': 1000,
      '-moz-perspective': 1000,
      '-ms-perspective': 1000,
      perspective: 1000
      /* Other transform properties here */
    }
  })
})
