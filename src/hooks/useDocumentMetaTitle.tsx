import { useEffect } from 'react'

export default function useDocumentMetaTitle(title?: string) {
  useEffect(() => {
    if (globalThis.document && title) Reflect.set(globalThis.document ?? {}, 'title', title)
  }, [])
}
