'use client';

import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useRouter,usePathname } from 'next/navigation';

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
    const { data: session, status } = useSession();
    const router = useRouter();

    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [loadingBots, setLoadingBots] = useState(false);
    const [firstChatbotId, setFirstChatbotId] = useState<string | null>(null);
// Navbar component içinde (state'lerin altında bir yere)
    const PUBLIC_BOT_ID = process.env.NEXT_PUBLIC_PUBLIC_CHATBOT_ID; // build-time
    const demoBotId = firstChatbotId || PUBLIC_BOT_ID || null;
    const demoHref = demoBotId ? `/public-chat?chatbotId=${demoBotId}` : "/public-chat";


    const pathname = usePathname();
    useEffect(() => {
        setIsMenuOpen(false);
    }, [pathname]);


    // Kullanıcının ilk chatbot’unu çek
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

    const handleStartChat = () => {
        if (!firstChatbotId) {
            alert('❗ Henüz bir chatbot seçmediniz/oluşturmadınız.');
            return;
        }
        router.push(`/chat?chatbotId=${firstChatbotId}`);
    };

    const navLinks = [
        { href: '/about', label: 'Hakkımızda' },
        { href: '/pricing', label: 'Fiyatlandırma' },
        { href: '/faq', label: 'SSS' },
        { href: '/contact', label: 'İletişim' },
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
                    {/* Logo */}
                    <div className="flex items-center">
                        <Link href="/" className="text-2xl font-bold text-gray-800">
                            ChatProjesi
                        </Link>
                    </div>

                    {/* Desktop nav links */}
                    <div className="hidden md:flex items-center space-x-6">
                        {navLinks.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                className="text-gray-600 hover:text-blue-600 transition-colors duration-300 font-medium text-sm"
                            >
                                {link.label}
                            </Link>
                        ))}
                        {/* YENİ: Genel Demo */}
                        <Link
                            href={demoHref}
                            className="text-gray-600 hover:text-blue-600 transition-colors duration-300 font-medium text-sm"
                        >
                            Genel Demo
                        </Link>
                        <Link
                            href="/conversations"
                            className="text-gray-600 hover:text-blue-600 transition-colors duration-300 font-medium text-sm"
                        >
                            Konuşmalar
                        </Link>


                        {session?.user?.role === 'ADMIN' && (
                            <Link
                                href="/admin"
                                className="text-gray-600 hover:text-blue-600 transition-colors duration-300 font-medium text-sm"
                            >
                                Admin
                            </Link>
                        )}
                    </div>

                    {/* Right side */}
                    <div className="flex items-center">
                        <div className="hidden md:block">
                            {status === 'loading' ? (
                                <div className="skeleton w-24 h-8" />
                            ) : session ? (
                                <>
                                    <button
                                        onClick={handleStartChat}
                                        className="btn btn-primary btn-sm mr-8"
                                        disabled={loadingBots || !firstChatbotId}
                                        title={!firstChatbotId ? 'Önce bir chatbot oluşturun' : 'Sohbete başla'}
                                    >
                                        Sohbete Başla
                                    </button>

                                    <div className="dropdown dropdown-end">
                                        <label tabIndex={0} className="btn btn-ghost btn-circle avatar">
                                            <div className="w-10 rounded-full">
                                                {session.user?.image ? (
                                                    <Image src={session.user.image} alt="Avatar" width={40} height={40} />
                                                ) : (
                                                    <div className="avatar placeholder">
                                                        <div className="bg-neutral text-neutral-content rounded-full w-10">
                                                            <span>{getInitials(session.user?.name)}</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </label>
                                        <ul
                                            tabIndex={0}
                                            className="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-base-100 rounded-box w-52"
                                        >
                                            <li>
                                                <Link href="/dashboard" className="font-semibold justify-between">
                                                    {session.user?.name}
                                                    <span className="badge">Yeni</span>
                                                </Link>
                                            </li>
                                            <li>
                                                <Link href="/dashboard">Panelim</Link>
                                            </li>
                                            {session.user?.role === 'ADMIN' && (
                                                <li>
                                                    <Link href="/admin">Admin</Link>
                                                </li>
                                            )}
                                            <div className="divider my-0" />
                                            <li>
                                                <button onClick={() => signOut({ callbackUrl: '/' })}>Çıkış Yap</button>
                                            </li>
                                        </ul>
                                    </div>
                                </>
                            ) : (
                                <Link href="/signin" className="btn btn-outline btn-primary btn-sm">
                                    Giriş Yap
                                </Link>
                            )}
                        </div>

                        {/* Mobile hamburger */}
                        <div className="md:hidden">
                            <button
                                onClick={() => setIsMenuOpen((v) => !v)}
                                className="inline-flex items-center justify-center p-2 rounded-md text-gray-800 hover:bg-gray-100"
                            >
                                {isMenuOpen ? <CloseIcon /> : <HamburgerIcon />}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile menu */}
            {isMenuOpen && (
                <div className="md:hidden fixed left-0 right-0 top-16 bottom-0 z-40 bg-white shadow-lg overflow-auto">
                    <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
                        {navLinks.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                className="text-gray-600 hover:bg-gray-100 block px-3 py-2 rounded-md text-base font-medium"
                                onClick={() => setIsMenuOpen(false)}
                            >
                                {link.label}
                            </Link>
                        ))}
                        {/* YENİ: Genel Demo (mobile) */}
                        <Link
                            href={demoHref}
                            className="text-gray-600 hover:bg-gray-100 block px-3 py-2 rounded-md text-base font-medium"
                            onClick={() => setIsMenuOpen(false)}
                        >
                            Genel Demo
                        </Link>
                        <Link
                            href="/conversations"
                            className="text-gray-600 hover:bg-gray-100 block px-3 py-2 rounded-md text-base font-medium"
                            onClick={() => setIsMenuOpen(false)}
                        >
                            Konuşmalar
                        </Link>

                        {session?.user?.role === 'ADMIN' && (
                            <Link
                                href="/admin"
                                className="text-gray-600 hover:bg-gray-100 block px-3 py-2 rounded-md text-base font-medium"
                                onClick={() => setIsMenuOpen(false)}
                            >
                                Admin
                            </Link>
                        )}

                        <div className="pt-4 mt-4 border-t border-gray-200">
                            {session ? (
                                <div className="px-2">
                                    <p className="font-semibold">{session.user?.name}</p>
                                    <p className="text-sm text-gray-500">{session.user?.email}</p>

                                    <button
                                        onClick={() => {
                                            handleStartChat();
                                            setIsMenuOpen(false);
                                        }}
                                        className="btn btn-primary w-full mb-2"
                                        disabled={loadingBots || !firstChatbotId}
                                    >
                                        Sohbete Başla
                                    </button>

                                    <button
                                        onClick={() => {
                                            signOut({ callbackUrl: '/' });
                                            setIsMenuOpen(false);
                                        }}
                                        className="w-full btn btn-error btn-sm mt-2"
                                    >
                                        Çıkış Yap
                                    </button>
                                </div>
                            ) : (
                                <Link
                                    href="/signin"
                                    className="btn btn-primary w-full"
                                    onClick={() => setIsMenuOpen(false)}
                                >
                                    Giriş Yap
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </nav>
    );
}