import "./globals.css";
import Navbar from "@/components/Navbar";
import Providers from "./provider"; // providers.tsx'i import et

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="tr" data-theme="light">
        <body>
        <Providers> {/* SessionProvider'ı içeren wrapper */}
            <div className="flex flex-col min-h-screen">
                <Navbar />
                <main className="flex-grow">{children}</main>
            </div>
        </Providers>
        </body>
        </html>
    );
}