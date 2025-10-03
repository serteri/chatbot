// src/app/sss/page.tsx

export default function SSSPage() {
    const faqData = [
        {
            question: "Bu chatbot hangi tür belgeleri destekliyor?",
            answer: "Platformumuz şu anda .pdf, .docx, ve .txt formatındaki belgeleri tam olarak desteklemektedir. Yüklediğiniz belgeler güvenli bir şekilde işlenir ve chatbot'unuzun bilgi bankasına eklenir."
        },
        {
            question: "Chatbot'u kendi web siteme nasıl ekleyebilirim?",
            answer: "Her chatbot için size özel bir 'embed' kodu (<iframe>) sağlıyoruz. Bu kodu kopyalayıp web sitenizin HTML koduna yapıştırmanız yeterlidir. Renkler ve başlangıç mesajı gibi özellikleri de özelleştirebilirsiniz."
        },
        {
            question: "Verilerim güvende mi?",
            answer: "Evet, güvenlik en büyük önceliğimizdir. Tüm verileriniz şifrelenmiş veritabanlarında saklanır ve yetkisiz erişime karşı modern güvenlik standartlarıyla korunur. Verileriniz asla üçüncü partilerle paylaşılmaz."
        },
        {
            question: "Aboneliğimi istediğim zaman iptal edebilir miyim?",
            answer: "Kesinlikle. Aboneliğinizi herhangi bir taahhüt olmadan dilediğiniz zaman paneliniz üzerinden kolayca iptal edebilirsiniz. İptal ettiğinizde, fatura döneminizin sonuna kadar planınızın özelliklerinden faydalanmaya devam edersiniz."
        },
        {
            question: "Ücretsiz deneme süresi neleri kapsıyor?",
            answer: "14 günlük ücretsiz deneme süremiz boyunca, 'Profesyonel' planımızın tüm özelliklerine tam erişim sağlarsınız. Bu süre boyunca birden fazla chatbot oluşturabilir, sınırsız belge yükleyebilir ve tüm özelleştirme seçeneklerini deneyebilirsiniz. Kredi kartı gerekmez."
        }
    ];

    return (
        <div className="bg-base-200 min-h-screen">
            <div className="container mx-auto px-4 py-16">
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold">Sıkça Sorulan Sorular</h1>
                    <p className="text-lg text-base-content/70 mt-4">
                        Aklınıza takılan bir şey mi var? Cevabı burada bulabilirsiniz.
                    </p>
                </div>

                <div className="max-w-3xl mx-auto space-y-4">
                    {faqData.map((item, index) => (
                        <div key={index} className="collapse collapse-plus bg-base-100 shadow-md">
                            <input type="radio" name="my-accordion-3" defaultChecked={index === 0} />
                            <div className="collapse-title text-xl font-medium">
                                {item.question}
                            </div>
                            <div className="collapse-content">
                                <p className="text-base-content/80">{item.answer}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}