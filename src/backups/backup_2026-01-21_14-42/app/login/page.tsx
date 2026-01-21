'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const result = await signIn('credentials', {
                username,
                password,
                redirect: false,
            });

            if (result?.error) {
                setError('Geçersiz kullanıcı adı veya şifre.');
                setLoading(false);
            } else {
                router.push('/');
                router.refresh();
            }
        } catch (err) {
            setError('Bir hata oluştu.');
            setLoading(false);
        }
    };

    return (
        <div className="d-flex align-items-center justify-content-center min-vh-100 bg-dark">
            <div className="card border-primary" style={{ width: '100%', maxWidth: '400px' }}>
                <div className="card-header bg-primary text-white text-center py-3">
                    <h4 className="mb-0 ls-1">DBANK GİRİŞ</h4>
                </div>
                <div className="card-body p-4 bg-body">
                    {error && (
                        <div className="alert alert-dismissible alert-danger">
                            <button type="button" className="btn-close" onClick={() => setError('')}></button>
                            {error}
                        </div>
                    )}
                    <form onSubmit={handleSubmit}>
                        <div className="form-group mb-3">
                            <label className="form-label text-white-50">Kullanıcı Adı</label>
                            <input
                                type="text"
                                className="form-control bg-dark text-white border-secondary"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="kullanıcı adı"
                                required
                            />
                        </div>
                        <div className="form-group mb-4">
                            <label className="form-label text-white-50">Şifre</label>
                            <input
                                type="password"
                                className="form-control bg-dark text-white border-secondary"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="şifre"
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            className="btn btn-primary w-100 py-2 fw-bold text-uppercase"
                            disabled={loading}
                        >
                            {loading ? 'Giriş Yapılıyor...' : 'GİRİŞ YAP'}
                        </button>
                    </form>
                </div>
                <div className="card-footer text-center py-3">
                    <small className="text-white-50">Güvenli Giriş Sistemi</small>
                </div>
            </div>
        </div>
    );
}
