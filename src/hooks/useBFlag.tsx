import { useEffect, useState } from 'react'

/**
 * use boolean flag. contain method and value it self
 * a replace of useToggle()
 * @deprecated use {@link useToggle} for consistent React-style
 */
export default function useBFlag(
  initValue: boolean | (() => boolean) = false,
  options?: { onChange?(value: boolean): void }
) {
  const [isOn, setIsOn] = useState(initValue)

  useEffect(() => {
    options?.onChange?.(isOn)
  }, [isOn])

  return {
    value: isOn,
    isOff: () => !isOn,
    isOn: () => isOn,
    on: () => setIsOn(true),
    off: () => setIsOn(false),
    toggle: () => setIsOn((b) => !b),
    set: setIsOn
  }
}
