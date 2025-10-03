import {notFound} from 'next/navigation';
import {getRequestConfig} from 'next-intl/server';

// Desteklenen dillerin listesi
const locales = ['en', 'tr'];

export default getRequestConfig(async ({locale}) => {
    // Gelen 'locale' parametresinin desteklenen dillerden biri olduğunu doğrula
    if (!locales.includes(locale as any)) notFound();

    return {
        messages: (await import(`./messages/${locale}.json`)).default
    };
});