const nextBuildId = require('next-build-id')

const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true'
})
const withGlobalCssConfig = require('next-global-css').withGlobalCss()

const moduleExports = {
  trailingSlash: true,

  productionBrowserSourceMaps: false,
  // hmr: false,

  generateBuildId: () => nextBuildId({ dir: __dirname }),

  /** @see https://nextjs.org/docs/advanced-features/i18n-routing */
  // i18n: {
  //   // locales: ['en-US', 'zh-CN'],
  //   locales: ['en-US'],
  //   defaultLocale: 'en-US'
  // },
  async redirects() {
    return [
      {
        source: '/liquidity',
        destination: '/liquidity/add',
        permanent: true
      },
      {
        source: '/acceleRaytor',
        destination: '/acceleraytor',
        permanent: false
      },
      {
        source: '/create',
        destination: '/create-position',
        permanent: false
      }
    ]
  }
  // async redirects() {
  //   return [
  //     {
  //       source: '/acceleRaytor',
  //       destination: 'https://v1.raydium.io/acceleRaytor',
  //       permanent: false
  //     },
  //     {
  //       source: '/acceleraytor',
  //       destination: 'https://v1.raydium.io/acceleRaytor',
  //       permanent: false
  //     }
  //   ]
  // }
}

module.exports = withBundleAnalyzer(withGlobalCssConfig(moduleExports))
