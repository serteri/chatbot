import { Inter } from 'next/font/google';
import { getMessages } from 'next-intl/server';
import Providers from '@/components/Providers';
import Navbar from '@/components/Navbar';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

// DEĞİŞİKLİK BURADA: 'params' objesini doğrudan alıyoruz.
export default async function LocaleLayout({
                                               children,
                                               params
                                           }: {
    children: React.ReactNode;
    params: {locale: string};
}) {
    // DEĞİŞİKLİK BURADA: 'locale'i içeriden alıyoruz.
    const { locale } = params;
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
