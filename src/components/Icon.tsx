import { Fragment, RefObject, useRef } from 'react'
import { twMerge } from 'tailwind-merge'

import mergeRef from '@/functions/react/mergeRef'
import { useClick, UseClickOptions } from '@/hooks/useClick'
import { useHover, UseHoverOptions } from '@/hooks/useHover'
import {
  AdjustmentsIcon,
  BellIcon,
  CheckCircleIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  ClipboardCopyIcon,
  DesktopComputerIcon,
  ExclamationCircleIcon,
  ExclamationIcon,
  ExternalLinkIcon,
  InformationCircleIcon,
  MenuIcon,
  MinusIcon,
  PlusIcon,
  QuestionMarkCircleIcon,
  RefreshIcon,
  SearchIcon,
  StarIcon,
  SwitchHorizontalIcon,
  SwitchVerticalIcon,
  XIcon,
  TrashIcon,
  DotsHorizontalIcon
} from '@heroicons/react/outline'

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
  | 'information-circle'
  | 'exclamation'
  | 'exclamation-circle'
  | 'question-mark-circle'
  | 'clipboard-copy'
  | 'external-link'
  | 'refresh'
  | 'search'
  | 'check'
  | 'star'
  | 'switch-horizontal'
  | 'bell'
  | 'desktop-computer'
  | 'trash'
  | 'dots-horizontal'
  | ' '

export interface IconProps {
  className?: string
  iconClassName?: string
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
}

export default function Icon({
  heroIconName,
  iconClassName,
  iconSrc,

  inline,
  onHover,
  /* this prop will auto add some tailwind class for Icon */
  onClick,
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
        ? MenuIcon
        : heroIconName === 'chevron-up'
        ? ChevronUpIcon
        : heroIconName === 'chevron-down'
        ? ChevronDownIcon
        : heroIconName === 'chevron-left'
        ? ChevronLeftIcon
        : heroIconName === 'chevron-right'
        ? ChevronRightIcon
        : heroIconName === 'x'
        ? XIcon
        : heroIconName === 'adjustments'
        ? AdjustmentsIcon
        : heroIconName === 'switch-vertical'
        ? SwitchVerticalIcon
        : heroIconName === 'plus'
        ? PlusIcon
        : heroIconName === 'minus'
        ? MinusIcon
        : heroIconName === 'check-circle'
        ? CheckCircleIcon
        : heroIconName === 'exclamation'
        ? ExclamationIcon
        : heroIconName === 'exclamation-circle'
        ? ExclamationCircleIcon
        : heroIconName === 'information-circle'
        ? InformationCircleIcon
        : heroIconName === 'question-mark-circle'
        ? QuestionMarkCircleIcon
        : heroIconName === 'clipboard-copy'
        ? ClipboardCopyIcon
        : heroIconName === 'external-link'
        ? ExternalLinkIcon
        : heroIconName === 'refresh'
        ? RefreshIcon
        : heroIconName === 'search'
        ? SearchIcon
        : heroIconName === 'check'
        ? CheckIcon
        : heroIconName === 'star'
        ? StarIcon
        : heroIconName === 'switch-horizontal'
        ? SwitchHorizontalIcon
        : heroIconName === 'bell'
        ? BellIcon
        : heroIconName === 'desktop-computer'
        ? DesktopComputerIcon
        : heroIconName === 'trash'
        ? TrashIcon
        : heroIconName === 'dots-horizontal'
        ? DotsHorizontalIcon
        : heroIconName === ' '
        ? ({ className }: { className?: string }) => <div className={className} />
        : Fragment
    return (
      <div className={twMerge(styleClass)} ref={mergeRef(selfRef, domRef)}>
        <HeroIconComponent
          /** HeroIcon can't use ref */
          className={twMerge(
            `w-full h-full ${
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
            `w-full h-full ${
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
