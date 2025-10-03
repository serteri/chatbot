import { Inter } from 'next/font/google';
import { getMessages } from 'next-intl/server';
import Providers from '@/components/provider';
import Navbar from '@/components/Navbar';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export default async function LocaleLayout({
                                               children,
                                               params: {locale} // locale'i burada hala alıyoruz, html lang için gerekli
                                           }: {
    children: React.ReactNode;
    params: {locale: string};
}) {
    // DEĞİŞİKLİK: getMessages() içine parametre vermiyoruz, kendi bulacak.
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