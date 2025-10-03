'use client';
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from 'next-intl/link'

export default function SignUpPage() {
    const router = useRouter();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password }),
        });

        const data = await response.json();

        if (response.ok) {
            // Kayıt başarılı, kullanıcıyı giriş sayfasına yönlendir
            router.push('/signin?message=Kaydınız başarıyla oluşturuldu. Lütfen giriş yapın.');
        } else {
            // Hata varsa göster
            setError(data.error || 'Bir hata oluştu.');
        }
        setIsLoading(false);
    };

    return (
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] bg-base-200">
            <div className="w-full max-w-sm p-8 space-y-6 bg-base-100 rounded-lg shadow-xl">
                <div className="text-center">
                    <h1 className="text-3xl font-bold">Hesap Oluştur</h1>
                    <p className="mt-2 text-sm text-gray-600">
                        Zaten bir hesabın var mı?{' '}
                        <Link href="/signin" className="link link-primary">
                            Giriş Yap
                        </Link>
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && <div className="alert alert-error text-sm p-2">{error}</div>}
                    <div className="form-control">
                        <label className="label"><span className="label-text">İsim</span></label>
                        <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="input input-bordered" required />
                    </div>
                    <div className="form-control">
                        <label className="label"><span className="label-text">Email</span></label>
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input input-bordered" required />
                    </div>
                    <div className="form-control">
                        <label className="label"><span className="label-text">Şifre</span></label>
                        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="input input-bordered" required minLength={6} />
                    </div>
                    <div className="form-control mt-6">
                        <button type="submit" className="btn btn-primary" disabled={isLoading}>
                            {isLoading ? <span className="loading loading-spinner"></span> : 'Kaydol'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}