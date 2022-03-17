/**
 * add default config object to original object. (will mutate object)
 */
export default function addDefault<T, W extends Partial<T>>(initConfig: T, defaultConfig: W): T & W {
  return { ...defaultConfig, ...initConfig }
}
