const nextBuildId = require('next-build-id')

const sentryWebpackPluginOptions = {
  // Additional config options for the Sentry Webpack plugin. Keep in mind that
  // the following options are set automatically, and overriding them is not
  // recommended:
  //   release, url, org, project, authToken, configFile, stripPrefix,
  //   urlPrefix, include, ignore

  silent: true // Suppresses all logs
  // For all available options, see:
  // https://github.com/getsentry/sentry-webpack-plugin#options.
}
const withSentryConfig = (otherConfig) =>
  require('@sentry/nextjs').withSentryConfig(otherConfig, sentryWebpackPluginOptions)

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
  i18n: {
    // locales: ['en-US', 'zh-CN'],
    locales: ['en-US'],
    defaultLocale: 'en-US'
  },
  async redirects() {
    return [
      {
        source: '/acceleRaytor',
        destination: 'https://v1.raydium.io/acceleRaytor',
        permanent: false
      },
      {
        source: '/acceleraytor',
        destination: 'https://v1.raydium.io/acceleRaytor',
        permanent: false
      }
    ]
  }
}

module.exports = withBundleAnalyzer(withGlobalCssConfig(withSentryConfig(moduleExports)))
