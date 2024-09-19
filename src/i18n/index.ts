import i18next from 'i18next';
import en from './translation/en.json';
import zh from './translation/zh.json';

export type Language = 'en' | 'zh';

export const LANGUAGES: Language[] = ['en', 'zh'];

i18next.init({
  fallbackLng: 'en',
  resources: { en: { translation: en }, zh: { translation: zh } }
});

export function changeLanguage(language: Language) {
  if (!LANGUAGES.includes(language)) {
    throw new Error(`Locale ${language} is not supported`);
  }
  i18next.changeLanguage(language);
}

export default i18next;