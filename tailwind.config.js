const { ibasic, imix } = require('./src/styles/basicUtilsPlugins')
const { cyberpunkLightBorders, cyberpunkBgLight, glassStyle } = require('./src/styles/themeStylePlugins')

/**@type {import("tailwindcss/tailwind-config").TailwindConfig} */
const config = {
  mode: 'jit',
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class', // or 'media' or 'class'
  theme: {
    extend: {
      screens: {
        // pc first!!
        pc: { max: '99999px' },
        tablet: { max: '1280px' },
        mobile: { max: '1000px' }
      },
      colors: {
        // 👇 app color
        primary: 'var(--primary)', // text color
        secondary: 'var(--secondary)', // text color
        'style-color-fuchsia': '#da2eef',
        'style-color-blue': '#2b6aff',
        'style-color-cyan': '#39d0d8',

        // 👇 state color
        'status-active': 'var(--status-active)',

        // 👇 text color
        'text-home-page-primary': 'var(--text-home-page-primary)',
        'text-home-page-secondary': 'var(--text-home-page-secondary)',
        'big-title': '#ffffff',
        'secondary-title': '#abc4ff',

        // 👇 ground color (like: <Card>'s background)
        'ground-color-light-solid': 'var(--ground-color-light-solid)',
        'ground-color-light': 'var(--ground-color-light)',
        'ground-color-slim': 'var(--ground-color-slim)',
        'ground-color': 'var(--ground-color)',
        'ground-color-dark': 'var(--ground-color-dark)',
        'ground-color-dark-solid': 'var(--ground-color-dark-solid)',

        // 👇 formkit color (link: <Button> or <Switch>)
        'formkit-label-text-active': 'var(--formkit-label-text-active)',
        'formkit-label-text-normal': 'var(--formkit-label-text-normal)',
        // heavier than label text
        'formkit-thumb-text-normal': 'var(--formkit-thumb-text-normal)',
        'formkit-thumb-text-disabled': 'var(--formkit-thumb-text-disabled)',
        'formkit-bg-active': 'var(--formkit-bg-active)',
        'formkit-bg-normal': 'var(--formkit-bg-normal)',
        // heavier than formkit bg
        'formkit-thumb': 'var(--formkit-thumb-color)',
        'formkit-thumb-disable': 'var(--formkit-thumb-color-disable)',
        'formkit-thumb-transparent': 'var(--formkit-thumb-color-transparent)',

        // 👇 component color
        'pop-over-bg-high': 'var(--pop-over-bg-high)',
        'pop-over-bg-low': 'var(--pop-over-bg-low)',
        'pop-over-ring': 'var(--pop-over-ring)',
        'pop-over-ring-2': 'var(--pop-over-ring-2)',
        'link-color': 'var(--link-color)',
        'link-decorator': 'var(--link-decorator)',
        'card-color': 'var(--card-color)',
        'app-line': 'var(--app-line-color)',
        'formkit-ground': 'var(--formkit-ground-color)',
        'formkit-line': 'var(--formkit-line-color)',

        // 👇🎃 other color
        'dropzone-card-bg': 'var(--card-color-dark)'
      },
      fontSize: {
        '2xs': '10px'
      },
      spacing: {
        0.125: '0.5px',
        0.25: '1px',
        0.375: '1.5px',
        0.5: '2px',
        scrollbar: '7px' // defined in initialize.css
      },
      /** @see https://semi.design/en-US/basic/tokens#z-index */
      zIndex: {
        backtop: '10',
        'model-mask': '999',
        'drawer-mask': '999',
        model: '1000',
        drawer: '1000',
        notification: '1010',
        popover: '1030',
        dropdown: '1050',
        tooltip: '1060'
      },
      borderWidth: {
        1.5: '1.5px'
      },
      borderRadius: {
        '3xl': '1.25rem',
        inherit: 'inherit'
      },
      ringWidth: {
        1.5: '1.5px'
      },
      flexGrow: {
        2: '2'
      },
      gridTemplateColumns: {
        '1-fr': '1fr',
        '2-fr': '1fr 1fr',
        '3-fr': '1fr 1fr 1fr',

        '4-fr': '1fr 1fr 1fr 1fr',
        '5-fr': '1fr 1fr 1fr 1fr 1fr',
        '6-fr': '1fr 1fr 1fr 1fr 1fr 1fr',
        '1-auto': 'auto',
        '2-auto': 'auto auto',
        '3-auto': 'auto auto auto',
        '4-auto': 'auto auto auto auto',
        '5-auto': 'auto auto auto auto auto',
        '6-auto': 'auto auto auto auto auto auto',
        'auto-fit': 'repeat(auto-fit, minmax(0, 1fr))'
      },
      transitionDuration: {
        3000: '3000ms', // for debug
        8000: '8000ms', // for debug
        'extremely-slow': '100s' // for debug
      },
      backgroundImage: {
        'popup-bg':
          'linear-gradient(139.48deg, rgba(0, 182, 191, 0.15) 1.07%, rgba(27, 22, 89, 0.1) 86.75%), linear-gradient(321.17deg, #18134D 0%, #1B1659 98.97%)',
        'cyberpunk-card-bg':
          'linear-gradient(140.14deg, rgba(0, 182, 191, 0.15) 0%, rgba(27, 22, 89, 0.1) 86.61%), linear-gradient(321.82deg, #18134D 0%, #1B1659 100%)'
      },
      boxShadow: {
        'cyberpunk-card': '0px 8px 48px rgba(171, 196, 255, 0.12)'
      }
    }
  },
  variants: {
    extend: {
      backgroundColor: ['even', 'odd'], // need it if JIT ?
      brightness: ['hover', 'focus', 'active'], // need it if JIT ?
      scale: ['active'] // need it if JIT ?
    }
  },
  plugins: [ibasic, imix, cyberpunkLightBorders, cyberpunkBgLight, glassStyle]
}

module.exports = config
