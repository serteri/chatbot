import { useTranslations } from 'next-intl';

export default function HomePage() {
    const t = useTranslations('HomePage');

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 py-8">
                <div className="text-center">
                    <h1 className="text-4xl font-bold text-gray-900 mb-6">
                        {t('title')}
                    </h1>
                    <p className="text-xl text-gray-600 mb-8">
                        {t('subtitle')}
                    </p>
                    <div className="space-y-4">
                        <a
                            href="/dashboard"
                            className="btn btn-primary btn-lg"
                        >
                            {t('getStarted')}
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}