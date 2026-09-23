import { ref, computed } from 'vue';
import ru from './ru';
import en from './en';
import zh from './zh';
import tg from './tg';

export type LocaleCode = 'ru' | 'en' | 'zh' | 'tg';

export interface LocaleOption {
  code: LocaleCode;
  name: string;
  nativeName: string;
  flagCountryCode: string;
}

export const availableLocales: LocaleOption[] = [
  { code: 'ru', name: 'Russian', nativeName: 'Русский', flagCountryCode: 'RU' },
  { code: 'en', name: 'English', nativeName: 'English', flagCountryCode: 'US' },
  { code: 'zh', name: 'Chinese', nativeName: '简体中文', flagCountryCode: 'CN' },
  { code: 'tg', name: 'Tajik', nativeName: 'Тоҷикӣ', flagCountryCode: 'TJ' },
];

const messages: Record<LocaleCode, any> = {
  ru,
  en,
  zh,
  tg,
};

const savedLocale = (localStorage.getItem('cargona_locale') as LocaleCode) || 'ru';
const currentLocale = ref<LocaleCode>(['ru', 'en', 'zh', 'tg'].includes(savedLocale) ? savedLocale : 'ru');

export function setLocale(locale: LocaleCode) {
  if (messages[locale]) {
    currentLocale.value = locale;
    localStorage.setItem('cargona_locale', locale);
    document.documentElement.lang = locale;
  }
}

export function t(path: string, params?: Record<string, any>): string {
  const lang = currentLocale.value;
  const dict = messages[lang] || messages.ru;
  const fallback = messages.ru;

  const parts = path.split('.');
  let val: any = dict;
  let fallbackVal: any = fallback;

  for (const part of parts) {
    if (val && typeof val === 'object' && part in val) {
      val = val[part];
    } else {
      val = undefined;
    }

    if (fallbackVal && typeof fallbackVal === 'object' && part in fallbackVal) {
      fallbackVal = fallbackVal[part];
    } else {
      fallbackVal = undefined;
    }
  }

  let result = typeof val === 'string' ? val : (typeof fallbackVal === 'string' ? fallbackVal : path);

  if (params && typeof result === 'string') {
    for (const [k, v] of Object.entries(params)) {
      result = result.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
    }
  }

  return result;
}

export function useI18n() {
  return {
    locale: currentLocale,
    availableLocales,
    setLocale,
    t,
  };
}
