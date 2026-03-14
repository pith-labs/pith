import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import pt from './locales/pt.json';
import es from './locales/es.json';
import fr from './locales/fr.json';

const resources = { en: { translation: en }, pt: { translation: pt }, es: { translation: es }, fr: { translation: fr } };
const supportedLngs = ['en', 'pt', 'es', 'fr'];

function getBrowserLang(): string {
  const browser = navigator.language?.slice(0, 2) || 'en';
  return supportedLngs.includes(browser) ? browser : 'en';
}

i18n.use(initReactI18next).init({
  resources,
  lng: getBrowserLang(),
  fallbackLng: 'en',
  supportedLngs,
  interpolation: { escapeValue: false },
});

// Restore saved locale when available (popup loads async)
if (typeof chrome !== 'undefined' && chrome.storage?.local) {
  chrome.storage.local.get(['pithLocale'], (r) => {
    const locale = r.pithLocale as string | undefined;
    if (locale && supportedLngs.includes(locale)) i18n.changeLanguage(locale);
  });
}

export function setLocale(lng: string) {
  i18n.changeLanguage(lng);
  if (typeof chrome !== 'undefined' && chrome.storage?.local) chrome.storage.local.set({ pithLocale: lng });
}

export default i18n;
