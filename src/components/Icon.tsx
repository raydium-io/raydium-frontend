import { Fragment, RefObject, useRef } from 'react'
import { twMerge } from 'tailwind-merge'

import mergeRef from '@/functions/react/mergeRef'
import { useClick, UseClickOptions } from '@/hooks/useClick'
import { useHover, UseHoverOptions } from '@/hooks/useHover'
import {
  AdjustmentsVerticalIcon,
  ArrowRightCircleIcon,
  ArrowsRightLeftIcon,
  ArrowsUpDownIcon,
  ArrowTopRightOnSquareIcon,
  Bars3Icon,
  BellIcon,
  CheckCircleIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  ClipboardDocumentIcon,
  ComputerDesktopIcon,
  EllipsisHorizontalIcon,
  EllipsisVerticalIcon,
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  LinkIcon,
  MagnifyingGlassIcon,
  MinusIcon,
  PencilIcon,
  PlusCircleIcon,
  PlusIcon,
  QuestionMarkCircleIcon,
  StarIcon,
  TrashIcon,
  XCircleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'

import { getFileNameOfURI } from '../functions/dom/getFileNameOfURI'

export type AppHeroIconName =
  | 'menu'
  | 'chevron-up'
  | 'chevron-down'
  | 'chevron-left'
  | 'chevron-right'
  | 'x'
  | 'adjustments'
  | 'switch-vertical'
  | 'plus'
  | 'minus'
  | 'check-circle'
  | 'x-circle'
  | 'information-circle'
  | 'exclamation'
  | 'exclamation-circle'
  | 'question-mark-circle'
  | 'clipboard-copy'
  | 'external-link'
  | 'search'
  | 'check'
  | 'star'
  | 'switch-horizontal'
  | 'bell'
  | 'desktop-computer'
  | 'trash'
  | 'dots-horizontal'
  | 'dots-vertical'
  | 'arrow-circle-right' // solid
  | 'plus-circle'
  | 'pencil'
  | 'link'
  | ' '

export interface IconProps {
  className?: string
  iconClassName?: string
  // TODO heroIcon?: (props: React.ComponentProps<'svg'>) => JSX.Element
  heroIconName?: AppHeroIconName
  iconSrc?: string
  /** sx: 12px; sm: 16px; smi: 20px; md: 24px; lg: 32px (default: md) */
  size?: 'xs' | 'sm' | 'smi' | 'md' | 'lg'
  domRef?: RefObject<any>
  /** component outer display will be block not-inline (TODO: it's nice if it can stay in className)*/
  inline?: boolean
  onHover?: UseHoverOptions['onHover']
  /* this prop will auto add some tailwind class for Icon */
  onClick?: UseClickOptions['onClick']
  forceColor?: string // TODO: <Icon> can basicly change theme color
}

export default function Icon({
  heroIconName,
  iconClassName,
  iconSrc,

  inline,
  onHover,
  /* this prop will auto add some tailwind class for Icon */
  onClick,
  forceColor,
  domRef,
  className,
  /** sx: 12px; sm: 16px; smi: 20px;  md: 24px; lg: 32px (default: md) */
  size = 'md'
}: IconProps) {
  const selfRef = useRef()
  const styleClass = twMerge(`Icon ${inline ? 'inline-grid' : 'grid'} h-[max-content] w-[max-content]`, className)
  useClick(selfRef, { onClick, disable: !onClick })
  useHover(selfRef, { onHover, disable: !onHover })

  if (heroIconName) {
    const HeroIconComponent =
      heroIconName === 'menu'
        ? Bars3Icon
        : heroIconName === 'chevron-up'
        ? ChevronUpIcon
        : heroIconName === 'chevron-down'
        ? ChevronDownIcon
        : heroIconName === 'chevron-left'
        ? ChevronLeftIcon
        : heroIconName === 'chevron-right'
        ? ChevronRightIcon
        : heroIconName === 'x'
        ? XMarkIcon
        : heroIconName === 'adjustments'
        ? AdjustmentsVerticalIcon
        : heroIconName === 'switch-vertical'
        ? ArrowsUpDownIcon
        : heroIconName === 'plus'
        ? PlusIcon
        : heroIconName === 'minus'
        ? MinusIcon
        : heroIconName === 'check-circle'
        ? CheckCircleIcon
        : heroIconName === 'x-circle'
        ? XCircleIcon
        : heroIconName === 'exclamation'
        ? ExclamationTriangleIcon
        : heroIconName === 'exclamation-circle'
        ? ExclamationCircleIcon
        : heroIconName === 'information-circle'
        ? InformationCircleIcon
        : heroIconName === 'question-mark-circle'
        ? QuestionMarkCircleIcon
        : heroIconName === 'clipboard-copy'
        ? ClipboardDocumentIcon
        : heroIconName === 'external-link'
        ? ArrowTopRightOnSquareIcon
        : heroIconName === 'search'
        ? MagnifyingGlassIcon
        : heroIconName === 'check'
        ? CheckIcon
        : heroIconName === 'star'
        ? StarIcon
        : heroIconName === 'switch-horizontal'
        ? ArrowsRightLeftIcon
        : heroIconName === 'bell'
        ? BellIcon
        : heroIconName === 'desktop-computer'
        ? ComputerDesktopIcon
        : heroIconName === 'trash'
        ? TrashIcon
        : heroIconName === 'dots-horizontal'
        ? EllipsisHorizontalIcon
        : heroIconName === 'dots-vertical'
        ? EllipsisVerticalIcon
        : heroIconName === 'arrow-circle-right'
        ? ArrowRightCircleIcon
        : heroIconName === 'plus-circle'
        ? PlusCircleIcon
        : heroIconName === 'pencil'
        ? PencilIcon
        : heroIconName === 'link'
        ? LinkIcon
        : heroIconName === ' '
        ? ({ className }: { className?: string }) => <div className={className} />
        : Fragment
    return (
      <div className={twMerge(styleClass)} ref={mergeRef(selfRef, domRef)}>
        <HeroIconComponent
          /** HeroIcon can't use ref */
          className={twMerge(
            `select-none w-full h-full ${
              size === 'md'
                ? 'h-6 w-6'
                : size === 'smi'
                ? 'h-5 w-5'
                : size === 'sm'
                ? 'h-4 w-4'
                : size === 'xs'
                ? 'h-3 w-3'
                : 'h-8 w-8'
            }`,
            iconClassName
          )}
        />
      </div>
    )
  }

  if (iconSrc) {
    return (
      <div className={styleClass} ref={mergeRef(selfRef, domRef)}>
        <img
          src={iconSrc}
          alt={getFileNameOfURI(iconSrc ?? '')}
          className={twMerge(
            `select-none w-full h-full ${
              size === 'md'
                ? 'h-6 w-6'
                : size === 'smi'
                ? 'h-5 w-5'
                : size === 'sm'
                ? 'h-4 w-4'
                : size === 'xs'
                ? 'h-3 w-3'
                : 'h-8 w-8'
            }`,
            iconClassName
          )}
        />
      </div>
    )
  }

  console.warn('not heroIconName or iconName in <Icon>')
  return null
}

export const socialIconSrcMap = {
  website: '/icons/acceleraytor-global.svg',
  twitter: '/icons/acceleraytor-twitter.svg',
  telegram: '/icons/acceleraytor-telegram.svg',
  discord: '/icons/acceleraytor-discord.svg',
  medium: '/icons/acceleraytor-medium.svg',
  twitch: '/icons/acceleraytor-twitch.svg',
  youtube: '/icons/acceleraytor-youtube.svg'
}
