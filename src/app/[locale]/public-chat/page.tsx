import { Suspense } from "react";
import PublicChatClient from "./PublicChatClient";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default function Page() {
    return (
        <Suspense fallback={<div className="p-6">Yükleniyor…</div>}>
            <PublicChatClient />
        </Suspense>
    );
}
