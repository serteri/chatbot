"use client";

import { useTranslations } from 'next-intl';
import Link from 'next/link';

export default function HomePage() {
    const t = useTranslations('HomePage');

    return (
        <div className="bg-base-100">
            <div className="container mx-auto px-4">
                <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] text-center">
                    <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6">
                        {t('title')}
                    </h1>
                    <p className="max-w-3xl text-lg md:text-xl text-base-content/80 mb-8">
                        {t('subtitle')}
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4">
                        <Link href="/signup" className="btn btn-primary btn-lg">
                            {t('getStarted')}
                        </Link>
                        <Link href="/#demo" className="btn btn-ghost btn-lg">
                            {t('viewDemo')}
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}