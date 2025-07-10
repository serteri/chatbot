// Bu layout, ana layout'tan farklı olarak Navbar veya
// genel stil sarmalayıcıları içermez.
// Sadece saf içeriği göstermek için tasarlanmıştır.
export default function EmbedLayout({
                                        children,
                                    }: {
    children: React.ReactNode;
}) {
    return (
        // Burada <html> ve <body> etiketlerini tekrar eklememize gerek yok,
        // Next.js bunu ana layout'tan devralır.
        // Sadece içeriğin kendisini döndürüyoruz.
        <div>{children}</div>
    );
}