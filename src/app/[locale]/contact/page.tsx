// src/app/contact/page.tsx

"use client";

import { useState, FormEvent } from 'react';

export default function ContactPage() {
    const [status, setStatus] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setIsLoading(true);
        setStatus('');

        const formData = new FormData(event.currentTarget);
        const data = Object.fromEntries(formData.entries());

        try {
            const response = await fetch('/api/contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                throw new Error('Mesaj gönderilirken bir hata oluştu.');
            }

            setStatus('success');
            (event.target as HTMLFormElement).reset(); // Formu sıfırla
        } catch (error: any) {
            setStatus('error');
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-base-200 min-h-screen py-16">
            <div className="container mx-auto px-4 max-w-2xl">
                <div className="card bg-base-100 shadow-xl">
                    <div className="card-body">
                        <h1 className="text-3xl font-bold text-center mb-2">Bize Ulaşın</h1>
                        <p className="text-center text-base-content/70 mb-8">
                            Kurumsal planlarımız hakkında bilgi almak veya projenizi görüşmek için lütfen formu doldurun.
                        </p>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* İsim */}
                            <div>
                                <label htmlFor="name" className="label">
                                    <span className="label-text">Adınız Soyadınız</span>
                                </label>
                                <input type="text" id="name" name="name" required className="input input-bordered w-full" />
                            </div>

                            {/* Şirket Adı */}
                            <div>
                                <label htmlFor="company" className="label">
                                    <span className="label-text">Şirket Adı (Opsiyonel)</span>
                                </label>
                                <input type="text" id="company" name="company" className="input input-bordered w-full" />
                            </div>

                            {/* E-posta */}
                            <div>
                                <label htmlFor="email" className="label">
                                    <span className="label-text">E-posta Adresiniz</span>
                                </label>
                                <input type="email" id="email" name="email" required className="input input-bordered w-full" />
                            </div>

                            {/* Mesaj */}
                            <div>
                                <label htmlFor="message" className="label">
                                    <span className="label-text">Mesajınız</span>
                                </label>
                                <textarea id="message" name="message" required className="textarea textarea-bordered w-full" rows={4}></textarea>
                            </div>

                            <div className="card-actions justify-end">
                                <button type="submit" className="btn btn-primary" disabled={isLoading}>
                                    {isLoading ? <span className="loading loading-spinner" /> : "Gönder"}
                                </button>
                            </div>
                        </form>

                        {/* Durum Mesajları */}
                        {status === 'success' && (
                            <div className="alert alert-success mt-6">
                                <span>Mesajınız başarıyla gönderildi. En kısa sürede size geri döneceğiz!</span>
                            </div>
                        )}
                        {status === 'error' && (
                            <div className="alert alert-error mt-6">
                                <span>Bir hata oluştu. Lütfen daha sonra tekrar deneyin.</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}