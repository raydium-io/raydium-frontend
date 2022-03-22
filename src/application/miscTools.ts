export type EffectCheckSetting = boolean | 'any pages' | undefined
export function shouldEffectBeOn(isWhen: EffectCheckSetting): boolean {
  return isWhen === 'any pages' || isWhen === true
}
