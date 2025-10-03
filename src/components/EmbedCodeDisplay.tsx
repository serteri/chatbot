// src/components/EmbedCodeDisplay.tsx (KULLANILMASI GEREKEN NİHAİ VERSİYON)

"use client";

import { useState } from 'react';

export default function EmbedCodeDisplay({ chatbotId }: { chatbotId: string }) {
  // Bu dinamik satır, nerede çalışıyorsa oranın adresini otomatik olarak alır.
  const domain = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';

  // Özelleştirme değerleri (Bunları daha sonra dashboard'da bir formdan alabilirsiniz)
  const primaryColor = "3B82F6";
  const headerText = "Bize Ulaşın";
  const initialMessage = "Merhaba, size nasıl yardımcı olabilirim?";

  const embedCode = `<iframe
  src="${domain}/embed?id=${chatbotId}&primaryColor=${primaryColor}&headerText=${encodeURIComponent(headerText)}&initialMessage=${encodeURIComponent(initialMessage)}"
  style="width: 100%; height: 600px; border: none;"
></iframe>`;

  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(embedCode.replace(/\n/g, ' '));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
      <div className="card bg-base-100 shadow-lg">
        <div className="card-body">
          <h3 className="card-title">Chatbot'u Sitenize Ekleyin</h3>
          <p className="text-sm text-base-content/70 mb-4">
            Bu kodu kopyalayıp web sitenizin HTML'ine yapıştırın.
          </p>
          <div className="relative">
            <pre className="bg-base-200 p-4 rounded-md overflow-x-auto text-xs"><code>{embedCode}</code></pre>
            <button onClick={handleCopy} className="btn btn-sm absolute top-2 right-2">
              {copied ? 'Kopyalandı!' : 'Kopyala'}
            </button>
          </div>
        </div>
      </div>
  );
}