'use client';

import { Link, useRouter, usePathname } from '@/navigation';
import { useSession, signOut } from 'next-auth/react';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl'; // next-intl'dan hook'u import ediyoruz

// Bitiş tarihi ile bugün arasındaki farkı gün olarak hesaplayan yardımcı fonksiyon
const getDaysRemaining = (endDate: any): number | null => {
    if (!endDate) return null;
    const end = new Date(endDate);
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    if (diff < 0) return 0; // Süre dolmuşsa 0 döndür
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

const HamburgerIcon = () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
    </svg>
);
const CloseIcon = () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
);

export default function Navbar() {
    const t = useTranslations('Navbar'); // Çeviri fonksiyonunu aktif ediyoruz
    const { data: session, status } = useSession();
    const router = useRouter(); // Bu artık next-intl'in router'ı
    const pathname = usePathname(); // Bu artık next-intl'in pathname'i


    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [loadingBots, setLoadingBots] = useState(false);
    const [firstChatbotId, setFirstChatbotId] = useState<string | null>(null);
    const [daysLeft, setDaysLeft] = useState<number | null>(null);

    const userPlan = (session?.user as any)?.plan;
    const trialEndsAt = (session?.user as any)?.trialEndsAt;
    const userRole = (session?.user as any)?.role;

    const PUBLIC_BOT_ID = process.env.NEXT_PUBLIC_PUBLIC_CHATBOT_ID;
    const demoBotId = firstChatbotId || PUBLIC_BOT_ID || null;
    const demoHref = demoBotId ? `/public-chat?chatbotId=${demoBotId}` : "/public-chat";

    useEffect(() => {
        setIsMenuOpen(false);
    }, [pathname]);


    useEffect(() => {
        if (status !== 'authenticated') {
            setFirstChatbotId(null);
            return;
        }
        let alive = true;
        (async () => {
            try {
                setLoadingBots(true);
                const res = await fetch('/api/my-chatbots');
                const data = await res.json();
                if (!alive) return;
                if (Array.isArray(data) && data.length > 0) {
                    setFirstChatbotId(data[0].id);
                } else {
                    setFirstChatbotId(null);
                }
            } catch {
                setFirstChatbotId(null);
            } finally {
                if (alive) setLoadingBots(false);
            }
        })();
        return () => { alive = false; };
    }, [status]);

    useEffect(() => {
        if (trialEndsAt) {
            setDaysLeft(getDaysRemaining(trialEndsAt));
        } else {
            setDaysLeft(null);
        }
    }, [trialEndsAt]);

    const handleStartChat = () => {
        router.push(`/dashboard`);
    };

    const navLinks = [
        { href: '/about', label: t('about') },
        { href: '/pricing', label: t('pricing') },
        { href: '/sss', label: t('faq') },
        { href: '/contact', label: t('contact') },
    ];

    const getInitials = (name?: string | null) => {
        if (!name) return '??';
        const parts = name.trim().split(/\s+/);
        return parts.length > 1 ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase() : name.slice(0, 2).toUpperCase();
    };

    return (
        <nav className="bg-white shadow-md sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4">
                <div className="flex items-center justify-between h-16">
                    <div className="flex items-center">
                        <Link href="/public" className="text-2xl font-bold text-gray-800">
                            {t('brandName')}
                        </Link>
                    </div>

                    <div className="hidden md:flex items-center space-x-6">
                        {navLinks.map((link) => (
                            <Link key={link.href} href={link.href} className="text-gray-600 hover:text-blue-600 transition-colors duration-300 font-medium text-sm">
                                {link.label}
                            </Link>
                        ))}
                        <Link href={demoHref} className="text-gray-600 hover:text-blue-600 transition-colors duration-300 font-medium text-sm">
                            {t('demo')}
                        </Link>
                        <Link href="/conversations" className="text-gray-600 hover:text-blue-600 transition-colors duration-300 font-medium text-sm">
                            {t('conversations')}
                        </Link>
                        {userRole === 'ADMIN' && (
                            <Link href="/admin" className="text-gray-600 hover:text-blue-600 transition-colors duration-300 font-medium text-sm">
                                {t('admin')}
                            </Link>
                        )}
                    </div>

                    <div className="flex items-center">
                        <div className="hidden md:block">
                            {status === 'loading' ? (
                                <div className="skeleton w-24 h-8" />
                            ) : session ? (
                                <>
                                    {userPlan === 'PRO' && typeof daysLeft === 'number' && daysLeft > 0 && (
                                        <div className="badge badge-warning font-semibold mr-4">
                                            {t('trialBadge', {daysLeft: daysLeft})}
                                        </div>
                                    )}
                                    <button onClick={handleStartChat} className="btn btn-primary btn-sm mr-8" disabled={loadingBots} title={!firstChatbotId ? t('createBotFirstTooltip') : t('startChatTooltip')}>
                                        {t('startChat')}
                                    </button>
                                    <div className="dropdown dropdown-end">
                                        <label tabIndex={0} className="btn btn-ghost btn-circle avatar">
                                            <div className="w-10 rounded-full">
                                                {session.user?.image ? (
                                                    <Image src={session.user.image} alt={t('avatarAlt')} width={40} height={40} />
                                                ) : (
                                                    <div className="avatar placeholder">
                                                        <div className="bg-neutral text-neutral-content rounded-full w-10">
                                                            <span>{getInitials(session.user?.name)}</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </label>
                                        <ul tabIndex={0} className="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-base-100 rounded-box w-52">
                                            <li>
                                                <div className="font-semibold justify-between pointer-events-none">
                                                    {session.user?.name}
                                                    <span className="badge">{t('newBadge')}</span>
                                                </div>
                                            </li>
                                            {userPlan === 'PRO' && typeof daysLeft === 'number' && daysLeft > 0 && (
                                                <li>
                                                    <div className="text-xs text-orange-600 pointer-events-none px-4 py-2">
                                                        {t('trialDropdown', {daysLeft: daysLeft})}
                                                    </div>
                                                </li>
                                            )}
                                            <div className="divider my-0" />
                                            <li><Link href="/dashboard">{t('myPanel')}</Link></li>
                                            {userRole === 'ADMIN' && (
                                                <li><Link href="/admin">{t('admin')}</Link></li>
                                            )}
                                            <li><button onClick={() => signOut({ callbackUrl: '/' })}>{t('signOut')}</button></li>
                                        </ul>
                                    </div>
                                </>
                            ) : (
                                <Link href="/signin" className="btn btn-outline btn-primary btn-sm">{t('signIn')}</Link>
                            )}
                        </div>

                        <div className="md:hidden">
                            <button onClick={() => setIsMenuOpen((v) => !v)} className="inline-flex items-center justify-center p-2 rounded-md text-gray-800 hover:bg-gray-100">
                                {isMenuOpen ? <CloseIcon /> : <HamburgerIcon />}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {isMenuOpen && (
                <div className="md:hidden fixed left-0 right-0 top-16 bottom-0 z-40 bg-white shadow-lg overflow-auto">
                    <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
                        {navLinks.map((link) => (
                            <Link key={link.href} href={link.href} className="text-gray-600 hover:bg-gray-100 block px-3 py-2 rounded-md text-base font-medium" onClick={() => setIsMenuOpen(false)}>
                                {link.label}
                            </Link>
                        ))}
                        <Link href={demoHref} className="text-gray-600 hover:bg-gray-100 block px-3 py-2 rounded-md text-base font-medium" onClick={() => setIsMenuOpen(false)}>
                            {t('demo')}
                        </Link>
                        <Link href="/conversations" className="text-gray-600 hover:bg-gray-100 block px-3 py-2 rounded-md text-base font-medium" onClick={() => setIsMenuOpen(false)}>
                            {t('conversations')}
                        </Link>
                        {userRole === 'ADMIN' && (
                            <Link href="/admin" className="text-gray-600 hover:bg-gray-100 block px-3 py-2 rounded-md text-base font-medium" onClick={() => setIsMenuOpen(false)}>
                                {t('admin')}
                            </Link>
                        )}
                        <div className="pt-4 mt-4 border-t border-gray-200">
                            {session ? (
                                <div className="px-2">
                                    <p className="font-semibold">{session.user?.name}</p>
                                    <p className="text-sm text-gray-500">{session.user?.email}</p>
                                    {userPlan === 'PRO' && typeof daysLeft === 'number' && daysLeft > 0 && (
                                        <div className="badge badge-warning w-full my-3">
                                            {t('trialMobile', {daysLeft: daysLeft})}
                                        </div>
                                    )}
                                    <button onClick={() => { handleStartChat(); setIsMenuOpen(false); }} className="btn btn-primary w-full mt-2 mb-2" disabled={loadingBots}>
                                        {t('startChat')}
                                    </button>
                                    <button onClick={() => { signOut({ callbackUrl: '/' }); setIsMenuOpen(false); }} className="w-full btn btn-error btn-sm mt-2">
                                        {t('signOut')}
                                    </button>
                                </div>
                            ) : (
                                <Link href="/signin" className="btn btn-primary w-full" onClick={() => setIsMenuOpen(false)}>
                                    {t('signIn')}
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </nav>
    );
}
