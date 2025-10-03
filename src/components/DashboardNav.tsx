// src/components/DashboardNav.tsx (NİHAİ HALİ)
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export default function DashboardNav() {
    const pathname = usePathname();
    const [firstChatbotId, setFirstChatbotId] = useState<string | null>(null);

    // Navigasyonun "Sohbet" linkini doğru ID'ye yönlendirebilmesi için
    // kullanıcının ilk chatbot'unu bulur.
    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                const res = await fetch('/api/my-chatbots');
                const data = await res.json();
                if (!alive) return;
                if (Array.isArray(data) && data.length > 0) {
                    setFirstChatbotId(data[0].id);
                }
            } catch {
                setFirstChatbotId(null);
            }
        })();
        return () => { alive = false; };
    }, []);

    // Eğer kullanıcının chatbot'u yoksa, "Sohbet" linki onu yeni bot oluşturma sayfasına yönlendirir.
    const chatHref = firstChatbotId ? `/chat/${firstChatbotId}` : '/dashboard/settings';

    const navLinks = [
        { href: '/dashboard', label: 'Panel' },
        { href: chatHref, label: 'Sohbet' },
        { href: '/dashboard/documents', label: 'Belgeler' } // Bu linki de ID'li yapmak ileride düşünülebilir.
    ];

    return (
        <div className="tabs tabs-bordered mb-8">
            {navLinks.map(link => (
                <Link key={link.href} href={link.href} legacyBehavior>
                    {/* Aktif olan sekmeyi vurgulamak için `tab-active` class'ını kullanıyoruz */}
                    <a className={`tab ${pathname === link.href ? 'tab-active' : ''}`}>
                        {link.label}
                    </a>
                </Link>
            ))}
        </div>
    )
}