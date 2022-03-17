export default function useProcessEnv() {
  const env = process.env.NODE_ENV
  return { isDevelopMode: env === 'development', isProductionMode: env === 'production' }
}
