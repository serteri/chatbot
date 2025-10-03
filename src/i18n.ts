import { createInstance } from 'next-intl';
import { NextRequest } from 'next/server';

export default async function getI18n(request: NextRequest) {
    const locale = request.headers.get('locale') || 'en';
    const i18n = createInstance();
    await i18n.init({
        locale,
        messages: (await import(`./messages/${locale}.json`)).default,
    });
    return i18n;
}