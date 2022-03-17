import React, { ComponentProps, Fragment, ReactNode, useMemo } from 'react'

import addPropsToReactElement from '@/functions/react/addPropsToReactElement'
import { pickReactChild, pickReactChildren } from '@/functions/react/pickChild'
import { Menu as _Menu, Transition } from '@headlessui/react'

/**
 * You cannot change the style of Styled Menu. so the template of the Menu is solid and stupid
 */
export default function Menu({ children }: { children?: ReactNode }) {
  const allItems = useMemo(
    () =>
      pickReactChildren(children, Menu.Item, (el, idx) =>
        addPropsToReactElement<ComponentProps<typeof Menu['Item']>>(el, {
          key: el.key ?? idx,
          $isRenderByMain: true
        })
      ),
    [children]
  )

  const button = useMemo(
    () =>
      pickReactChild(children, Menu.Button, (el) =>
        addPropsToReactElement<ComponentProps<typeof Menu['Button']>>(el, {
          $isRenderByMain: true
        })
      ),
    [children]
  )

  return (
    <_Menu as="div" className="relative">
      {({ open }) => (
        <>
          {button}
          <Transition
            show={open}
            enter="transition ease-out duration-100"
            enterFrom="transform opacity-0 scale-95"
            enterTo="transform opacity-100 scale-100"
            leave="transition ease-in duration-75"
            leaveFrom="transform opacity-100 scale-100"
            leaveTo="transform opacity-0 scale-95"
          >
            <_Menu.Items
              static
              className="absolute z-10 right-0 mt-2 w-max origin-top-right bg-ground-color-dark shadow-xl rounded-lg cyberpunk-border cyberpunk-border-rounded-lg p-4 grid gap-4"
            >
              {allItems}
            </_Menu.Items>
          </Transition>
        </>
      )}
    </_Menu>
  )
}

Menu.Button = function StyledMenuButton({
  $isRenderByMain,
  children
}: {
  $isRenderByMain?: boolean
  children?: ReactNode
}) {
  if (!$isRenderByMain) return null
  return <_Menu.Button>{children}</_Menu.Button>
}

Menu.Item = function StyledMenuItem({
  $isRenderByMain,
  children
}: {
  $isRenderByMain?: boolean
  children?: ReactNode
}) {
  if (!$isRenderByMain) return null
  return <_Menu.Item>{children}</_Menu.Item>
}
