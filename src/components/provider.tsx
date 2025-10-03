"use client";

import { NextIntlClientProvider, AbstractIntlMessages } from 'next-intl';
import { SessionProvider } from 'next-auth/react';

type Props = {
    children: React.ReactNode;
    messages: AbstractIntlMessages;
    locale: string;
};

// Bu bileşen, hem dil çevirilerini (next-intl) hem de kullanıcı oturumunu (next-auth)
// tüm uygulamanın kullanımına sunar.
export default function Providers({ children, messages, locale }: Props) {
    return (
        <NextIntlClientProvider locale={locale} messages={messages}>
            <SessionProvider>
                {children}
            </SessionProvider>
        </NextIntlClientProvider>
    );
}

