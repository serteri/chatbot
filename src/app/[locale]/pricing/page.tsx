// src/app/pricing/page.tsx (BÜTÜN, TAM VE KISALTMA OLMAYAN NİHAİ HALİ)
// src/app/pricing/page.tsx (NİHAİ HALİ)

"use client";

import Link from 'next-intl/link'
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';

// Tarih farkını gün olarak hesaplayan yardımcı fonksiyon
const getDaysRemaining = (endDate: any): number | null => {
    if (!endDate) return null;
    const end = new Date(endDate);
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    if (diff < 0) return 0; // Süre dolmuş
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

export default function PricingPage() {
    const { data: session, status } = useSession();
    const userPlan = (session?.user as any)?.plan;
    const trialEndsAt = (session?.user as any)?.trialEndsAt;

    const [daysLeft, setDaysLeft] = useState<number | null>(null);

    useEffect(() => {
        if (trialEndsAt) { setDaysLeft(getDaysRemaining(trialEndsAt)); }
    }, [trialEndsAt]);

    const handleSubscribe = (plan: 'PRO' | 'ENTERPRISE') => {
        alert(`Şimdi ${plan} planına yükseltme işlemi başlayacak...`);
    };

    return (
        <div className="bg-base-200 min-h-screen">
            <div className="container mx-auto px-4 py-16 text-center">

                {status === 'loading' && (
                    <div>
                        <div className="skeleton h-12 w-1/2 mx-auto mb-4"></div>
                        <div className="skeleton h-6 w-2/3 mx-auto mb-12"></div>
                    </div>
                )}

                {status === 'authenticated' && session && (
                    <div>
                        <h1 className="text-4xl font-bold mb-4">Hoş geldin, {session.user?.name || 'Kullanıcı'}!</h1>
                        {userPlan === 'PRO' && typeof daysLeft === 'number' && daysLeft > 0 ? (
                            <p className="text-lg text-base-content/70 mb-12">Profesyonel plan denemenizin bitmesine <strong>{daysLeft} gün</strong> kaldı.</p>
                        ) : (
                            <p className="text-lg text-base-content/70 mb-12">Mevcut planınızı yönetin veya daha yüksek bir plana geçin.</p>
                        )}
                    </div>
                )}

                {status === 'unauthenticated' && (
                    <div>
                        <h1 className="text-4xl font-bold mb-4">Choose The Right Plan For You</h1>
                        <p className="text-lg text-base-content/70 mb-12">Start your 14-day free trial today. No credit card required.</p>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

                    <div className="card bg-base-100 shadow-xl border">
                        <div className="card-body relative">
                            {userPlan === 'PRO' && typeof daysLeft === 'number' && daysLeft > 0 && (<div className="badge badge-warning absolute top-4 right-4">Denemeniz Aktif</div>)}
                            <h2 className="card-title text-2xl mx-auto">Free Trial</h2>
                            <p className="text-base-content/70 my-2">Experience all Professional features for 14 days.</p>
                            <p className="text-4xl font-bold my-4">$0<span className="text-xl font-normal"> for 14 Days</span></p>
                            <ul className="space-y-2 text-left mb-6">
                                <li>✅ 5 Chatbots</li>
                                <li>✅ 2,000 Messages/mo</li>
                                <li>✅ Unlimited Documents</li>
                            </ul>
                            <div className="card-actions justify-center">
                                {session ? (<button className="btn btn-disabled">{typeof daysLeft === 'number' && daysLeft > 0 ? `${daysLeft} gün kaldı` : 'Denemeniz Aktif'}</button>) : (<Link href="/signup" className="btn btn-primary">Start Your Free Trial</Link>)}
                            </div>
                        </div>
                    </div>

                    <div className="card bg-base-100 shadow-xl border-2 border-primary">
                        <div className="card-body relative">
                            {userPlan === 'PRO' && (typeof daysLeft === 'number' ? daysLeft <= 0 : true) && (<div className="badge badge-primary absolute top-4 right-4">Mevcut Plan</div>)}
                            <h2 className="card-title text-2xl mx-auto">Professional</h2>
                            <p className="text-base-content/70 my-2">Ideal for professionals and small businesses.</p>
                            <p className="text-4xl font-bold my-4">$19<span className="text-xl font-normal">/mo</span></p>
                            <ul className="space-y-2 text-left mb-6">
                                <li>✅ 5 Chatbots</li>
                                <li>✅ 2,000 Messages/mo</li>
                                <li>✅ Unlimited Documents</li>
                            </ul>
                            <div className="card-actions justify-center">
                                {session ? (userPlan === 'PRO' ? <button className="btn btn-disabled" disabled>Mevcut Planınız</button> : <button onClick={() => handleSubscribe('PRO')} className="btn btn-primary">Upgrade to Pro</button>) : (<Link href="/signup?plan=professional" className="btn btn-primary">Choose Plan</Link>)}
                            </div>
                        </div>
                    </div>

                    <div className="card bg-base-100 shadow-xl border">
                        <div className="card-body relative">
                            {userPlan === 'ENTERPRISE' && <div className="badge badge-neutral absolute top-4 right-4">Mevcut Plan</div>}
                            <h2 className="card-title text-2xl mx-auto">Enterprise</h2>
                            <p className="text-base-content/70 my-2">Tailored for large organizations with custom needs.</p>
                            <p className="text-4xl font-bold my-4">Contact Us</p>
                            <ul className="space-y-2 text-left mb-6">
                                <li>✅ Unlimited Chatbots</li>
                                <li>✅ Custom Message Limits</li>
                                <li>✅ Priority Support</li>
                            </ul>
                            <div className="card-actions justify-center"><Link href="/contact" className="btn btn-outline">Get a Quote</Link></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}