'use client';

import { signIn } from 'next-auth/react';
import React from 'react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';


// Marka ikonları için basit SVG'ler
const GoogleIcon = () => <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 mr-2"><title>Google</title><path d="M12.48 10.92v3.28h7.84c-.24 1.84-.85 3.18-1.73 4.1-1.02 1.02-2.6 1.84-4.84 1.84-5.84 0-10.62-4.7-10.62-10.62s4.78-10.62 10.62-10.62c3.37 0 5.39 1.34 6.62 2.52l2.84-2.78C19.69 1.65 16.46 0 12.48 0 5.58 0 0 5.58 0 12.48s5.58 12.48 12.48 12.48c7.2 0 12.12-4.19 12.12-12.72 0-.81-.07-1.61-.25-2.4z"/></svg>;
const MicrosoftIcon = () => <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 mr-2"><title>Microsoft</title><path d="M11.41 2.339H2.341v9.069h9.069V2.339zM21.659 2.339h-9.069v9.069h9.069V2.339zM11.41 12.589H2.341v9.069h9.069v-9.069zM21.659 12.589h-9.069v9.069h9.069v-9.069z"/></svg>;
const GitHubIcon = () => <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 mr-2"><title>GitHub</title><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>;


export default function SignInPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleCredentialSignIn = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(''); // Hata mesajını sıfırla

        const result = await signIn('credentials', {
            redirect: false, // Sayfa yönlendirmesini biz yapacağız
            email,
            password,
        });

        if (result?.error) {
            // Eğer giriş başarısızsa, hata mesajı göster
            setError('Girdiğiniz email veya şifre yanlış.');
        } else if (result?.ok) {
            // Eğer giriş başarılıysa, ana sayfaya yönlendir
            router.push('/');
        }
    };

    return (
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] bg-base-200">
            <div className="w-full max-w-sm p-8 space-y-6 bg-base-100 rounded-lg shadow-xl">
                <div className="text-center">
                    <h1 className="text-3xl font-bold">Tekrar Hoş Geldin!</h1>
                    <p className="mt-2 text-sm text-gray-600">Devam etmek için bir hesap seçin</p>
                </div>

                {/* Sosyal Medya Giriş Butonları */}
                <div className="space-y-4">
                    <button onClick={() => signIn('google', { callbackUrl: '/' })} className="w-full btn btn-outline flex items-center justify-center">
                        <GoogleIcon /> Google ile Devam Et
                    </button>
                    {/* Microsoft için provider ID'si azure-ad'dir */}
                    <button onClick={() => signIn('azure-ad', { callbackUrl: '/' })} className="w-full btn btn-outline flex items-center justify-center">
                        <MicrosoftIcon /> Microsoft ile Devam Et
                    </button>
                    <button onClick={() => signIn('github', { callbackUrl: '/' })} className="w-full btn btn-outline flex items-center justify-center">
                        <GitHubIcon /> GitHub ile Devam Et
                    </button>
                </div>

                <div className="divider">VEYA</div>

                {/* Email/Password Formu (Gelecekte Eklenecek) */}
                {/* Email/Password Formu */}
                <form onSubmit={handleCredentialSignIn}>
                    {error && <p className="text-sm text-center text-red-500">{error}</p>}
                    <div className="form-control">
                        <label className="label"><span className="label-text">Email</span></label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="input input-bordered"
                            required
                        />
                    </div>
                    <div className="form-control mt-4">
                        <label className="label"><span className="label-text">Şifre</span></label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="input input-bordered"
                            required
                        />
                    </div>
                    <div className="form-control mt-6">
                        <button type="submit" className="btn btn-primary">Email ile Giriş Yap</button>
                    </div>
                </form>
                <div className="text-center mt-6">
                    <p className="text-sm">
                        Hesabın yok mu?{' '}
                        <Link href="/signup" className="link link-primary font-semibold">
                            Hemen Kaydol
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}