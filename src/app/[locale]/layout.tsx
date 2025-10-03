import { Inter } from 'next/font/google';
import { getMessages } from 'next-intl/server';
import Providers from '@/components/Providers';
import Navbar from '@/components/Navbar';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export default async function LocaleLayout({
                                               children,
                                               params: {locale} // Parametreyi bu şekilde almak doğrudur
                                           }: {
    children: React.ReactNode;
    params: {locale: string};
}) {
    // getI18n gibi karmaşık fonksiyonlara gerek yok.
    // getMessages() locale'i otomatik olarak anlar.
    const messages = await getMessages();

    return (
        <html lang={locale}>
        <body className={inter.className}>
        <Providers locale={locale} messages={messages}>
            <Navbar />
            <main>{children}</main>
        </Providers>
        </body>
        </html>
    );
}