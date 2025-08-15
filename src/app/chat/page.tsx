import { Suspense } from "react";
import ChatPageClient from "./ChatPageClient";

export const dynamic = "force-dynamic"; // SSG yok, runtime'da render
export const fetchCache = "force-no-store"; // (opsiyonel) cache olmasın

export default function Page() {
    return (
        <Suspense fallback={<div className="p-6">Yükleniyor…</div>}>
            <ChatPageClient />
        </Suspense>
    );
}