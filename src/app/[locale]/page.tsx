import { getTranslations } from 'next-intl/server';
import Link from 'next/link';

interface Props {
    params: { locale: string };
}

export default async function HomePage({ params }: Props) {
    const { locale } = params;

    const t = await getTranslations('HomePage');

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 py-16">
                <div className="text-center">
                    <h1 className="text-5xl font-bold text-gray-900 mb-6">
                        {t('title')}
                    </h1>
                    <p className="text-xl text-gray-600 mb-8">
                        {t('subtitle')}
                    </p>
                    <div className="flex gap-4 justify-center">
                        <Link
                            href="/dashboard"
                            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            {t('getStarted')}
                        </Link>
                        <Link
                            href="/about"
                            className="bg-gray-200 text-gray-800 px-6 py-3 rounded-lg hover:bg-gray-300 transition-colors"
                        >
                            {t('viewDemo')}
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}