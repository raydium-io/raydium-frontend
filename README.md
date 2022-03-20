**deprecated**

# Raydium Frontend

it's a SSR app of Raydium. our aim is **no fuzzy trading**

# Convention

- ## use `domRef` instead of `ref` in not HTML build-in components

  for `ref` is managed by react, so component can't pass prop:`ref`(same as prop:`key`)

  But WrapperComponent must pass ref.

# Features

- ## ✅ **Light mode / Dark mode**
  use [useTheme()](./src/appHooks/useTheme.tsx) to achieve this
- ## ✅ **auto mobile style**
  use [useIsMobile()](./src/hooks/useIsMobile.tsx) to achieve this

for devlopers:

- ## ✅ **split style and js code**

  define ClassName(./src/components/wrappers) in .css and UIComponent(./src/components) to achieve this

- ## ✅ **WrapperComponent**

  it works the same level of react hook. but you can compose it easier without affact normal code in component.
  (wrapperComponent can be used in UIComponent for unity)
  (wrapperComponent should wrap interaction. As interaction use JS, domRef must be passed by wrapperComponent)

- ## ❔ **handy page setting**

  put settings (such as text) on the top

- ## ✅ **just objectRef**
  no need callbackRef. if have to, use [useCallbackRef()](./src/hooks/useCallbackRef.tsx) instead, it will create a proxied object ref to simulate the action that React callback ref have.

# RoadMap

(_later or never_ means the feature is not very urgent, so dever)

- ❔ smart SDK glue.
- ❔ ui: some `FormComponent` (these are baseUI that hold )
- ❔ ui: create `ClassNameComponent` to hold customized class. for example, create `<forstedGlass>` `ClassNameComponent`
- ❔ create useRecordeStorage(). So user may not lose his state when page shut/refresh manually.
- ✅ i18n system. all text in a page should have an object to hold it for changing it easily
- ❔ mock data system. (_later or never_)
- ❔ cache system. (_later or never_) ( cache state + cache api response (just use [SWR](https://swr.vercel.app/)) )
- ❔ plugin system. (_later or never_)
- ❔ user can tap `` ` `` key to open dev command panel, which can accept verious command lines. (_later or never_)
- ❔ user can use keyshort to navigate. (_later or never_)
- ❔ run-time data shape system. For validate the data from backend (_sooner or later_)

# File navigate (far from complete)

## pages

[swap](./src/pages/swap.tsx) this page this the core of Raydium.

## components - baseUI

- ### [\<Collapse>](./src/components/Collapse.tsx)

  it's like HTML `<deatail>`

- ### [\<List>](./src/components/List.tsx)

  (too old, don't use if you can)

  `<List>` should evolve into `<Grid>`

- ### [\<MetaTitle>](./src/components/MetaTitle.tsx)

  change the title in html `<head>`. This component exist for easier composition.

- ### [\<NumberJelly>](./src/components/NumberJelly.tsx)

  have number transition and formate, which will make the UI of number smoothly

- ### [\<PageLayout>](./src/components/PageLayout.tsx)

  manage the general layout of the APP

- ### [\<Row>](./src/components/Row.tsx)

  `keyboard focusble`

  flex box

- ### [\<TableList>](./src/components/TableList.tsx)

  HTML `<table>` but use `.` accessor to get child component

- ### [\<Card>](./src/components/Card.tsx)

  Just a `<div>`. write for readability

- ### [\<Modal>](./src/components/Modal.tsx)

  it should be in the same level as [\<Card>](./src/components/Card.tsx)

## components - wrapperComponent

- ### [\<AttachHoverable>](./src/components/wrappers/AttachHoverable.tsx)

  this make can hover. it will add a hover style through className. and add some aria to it's root element.

- ### [\<useClickableElementRef>](./src/components/wrappers/useClickableElementRef.tsx)

  just onClick with some default style

- ### [\<AttachButtonLike>](./src/components/wrappers/AttachButtonLike.tsx)

  (a componse of [\<AttachHoverable>](./src/components/wrappers/AttachHoverable.tsx) and [\<useClickableElementRef>](./src/components/wrappers/useClickableElementRef.tsx))

  It will additionally add some aria attribute.

  this make an element act like a \<button> (which can be focused use keyboard and have hover style and active style).

- ### [\<AttachForestedGlass](./src/components/wrappers/AttachForestedGlass.tsx)

  style: forest-glass

- ### [\<AttachCustomizedClassName](./src/components/wrappers/AttachCustomizedClassName.tsx)

  attach className. (If not complete StyleWrapper yet, use this for faster development)

- ### [\<AttachWrappers>](src/components/wrappers/AttachWrappers.tsx)

  an WrapperComponent that can hold all other components

## component

- ### [\<NavbarWallet>](./src/components/NavbarWallet.tsx)

  build a Wallet widget on navbar

## hooks

- ### useRouter()

  -- get router object (this hook is provided by next/router)

  ```ts
  import { useRouter } from 'next/router'
  const { pathname } = useRouter()
  ```

- ### [useHover()](./src/hooks/useHover.tsx)

  -- just like css `:hover`

  ```ts
  useHover(itemRef, {
    onHover({ state }) {
      if (state === 'start') {
        timeoutController.current.pause()
        pauseTimeline()
      } else {
        timeoutController.current.resume()
        resumeTimeline()
      }
    }
  })
  ```

- ### [useStateRecorder()](./src/hooks/useStateRecorder.tsx)

  -- record state in localstorage (app need to recode user's preferences. such as the theme user prefer)

  ```ts
  const [_isScrollingDown, { on: setScrollingDown, off: setScrollingUp, set: setScrolling }] = useToggle(
    getStateFromStorage('PageLayout: isScrollingDown', false)
  )
  const isScrollingDown = useStateRecorder(_isScrollingDown, setScrolling, 'PageLayout: isScrollingDown')
  ```

- ### [useRecordToggle()](./src/hooks/useRecordToggle.tsx)
  -- `useToggle()` + `useStateRecorder`
  ```ts
  const [_isScrollingDown, { on: setScrollingDown, off: setScrollingUp, set: setScrolling }] = useToggle(
    getStateFromStorage('PageLayout: isScrollingDown', false)
  )
  const isScrollingDown = useRecordToggle(_isScrollingDown, setScrolling, 'PageLayout: isScrollingDown')
  ```

## other function

- HOC: [addRegistor()](./src/utils/react/addRegistor.tsx)

  -- Adds registor for the TargetComponent(usually the page's Root Component)
