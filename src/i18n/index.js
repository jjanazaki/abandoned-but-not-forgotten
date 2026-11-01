// src/i18n/index.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
const resources = {
    en: {
        translation: {
            title: 'Abandoned but not Forgotten',
            explore: 'Explore!',
            timeline: 'View Timeline',
            backSolar: 'Back to Solar System',
            backPlanet: 'Back to Planet',
            showMore: 'Show more',
            showLess: 'Show less',
            download: 'Download Equipment File',
        },
    },
    ar: {
        translation: {
            title: 'Abandoned but not Forgotten',
            explore: 'Explore!',
            timeline: 'View Timeline',
            backSolar: 'العودة إلى المجموعة الشمسية',
            backPlanet: 'العودة إلى الكوكب',
            showMore: 'عرض أكثر',
            showLess: 'عرض أقل',
            download: 'تحميل ملف المعدة',
        },
    },
};
i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
    resources,
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
});
export default i18n;
