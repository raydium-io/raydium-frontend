export function noTailingPeriod(str: string): string {
  return str.replace(/\.$/, '')
}
