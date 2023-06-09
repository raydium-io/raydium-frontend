import { useEffect, useLayoutEffect } from 'react'

import { inClient } from '@/functions/judgers/isSSR'

export const useIsomorphicLayoutEffect = inClient ? useLayoutEffect : useEffect
