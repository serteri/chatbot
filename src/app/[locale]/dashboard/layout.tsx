// src/app/dashboard/layout.tsx (NİHAİ HALİ)

import DashboardNav from "@/components/DashboardNav";

export default function DashboardLayout({
                                            children,
                                        }: {
    children: React.ReactNode
}) {
    return (
        // Bu max-w-4xl, tüm panel sayfalarını ortalar ve hizalar.
        <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
            <DashboardNav />
            <main>
                {children}
            </main>
        </div>
    )
}