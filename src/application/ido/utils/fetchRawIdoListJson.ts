import jFetch from '@/functions/dom/jFetch'
import { RawIdoListJson } from '../type'

export async function fetchRawIdoListJson(): Promise<RawIdoListJson> {
  // eslint-disable-next-line no-console
  console.info('idoList start fetching')
  const data = await jFetch('/ido-list.json')
  // eslint-disable-next-line no-console
  console.info('idoList end fetching')
  return data
}
