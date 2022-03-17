export default function addTabIndex(el: HTMLElement | undefined | null) {
  if (!el) return
  Reflect.set(el, 'tabIndex', 0)
  el.addEventListener('keypress', ({ key }) => {
    switch (key) {
      case ' ': {
        el.click()
        break
      }
      case 'Enter': {
        el.click()
        break
      }
    }
  })
}
