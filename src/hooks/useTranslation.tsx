import enUS from '@/translations/en-US'
import zhCN from '@/translations/zh-CN'
import { useRouter } from 'next/router'

/**
 * access ../translations
 */
export default function useTranslation() {
  const { locale, asPath, push } = useRouter()
  const t = locale === 'en-US' ? enUS : zhCN
  const availableLanguages = ['en-US', 'zh-CN'] as const
  function changeLanguage(targetLanguage: typeof availableLanguages[number]) {
    push(asPath, asPath, { locale: targetLanguage })
  }
  return { t, currentLanguage: locale, availableLanguages, changeLanguage }
}
