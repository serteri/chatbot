"use client";

import { useState } from "react";

export default function EmbedCodeDisplay({ chatbotId }: { chatbotId: string }) {
  const [copied, setCopied] = useState(false);

  const embedCode = `<iframe src="https://your-domain.com/embed?chatbotId=${chatbotId}" width="100%" height="600px" frameborder="0"></iframe>`;

  const handleCopy = () => {
    navigator.clipboard.writeText(embedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="card bg-base-100 shadow-md">
      <div className="card-body">
        <h3 className="card-title">Websitenize Gömün</h3>
        <p className="text-sm opacity-70">Bu kodu kendi sitenize ekleyerek chatbot'u embed edebilirsiniz.</p>

        <div className="form-control mt-4">
          <textarea
            className="textarea textarea-bordered text-xs"
            value={embedCode}
            rows={4}
            readOnly
          ></textarea>
          <button className="btn btn-outline btn-sm mt-2" onClick={handleCopy}>
            {copied ? "Kopyalandı!" : "Kodu Kopyala"}
          </button>
        </div>
      </div>
    </div>
  );
}