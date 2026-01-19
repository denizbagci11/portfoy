"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, History, PlusCircle, TrendingUp, Download, Upload, Settings } from 'lucide-react';
import { usePortfolio } from '@/lib/store';
import { useRef } from 'react';
import { signOut } from 'next-auth/react';

// Define session type locally or import from next-auth
interface NavbarProps {
    session: any; // Using any for simplicity as session structure is standard
}

export default function Navbar({ session }: NavbarProps) {
    const pathname = usePathname();
    const { exportData, importData } = usePortfolio();
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Hide navbar if not logged in
    if (!session) return null;

    const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target?.result as string;
            try {
                importData(content);
                alert("Veriler başarıyla yüklendi!");
            } catch (err) {
                alert("Yükleme başarısız oldu. Lütfen geçerli bir yedek dosyası seçin.");
            }
        };
        reader.readAsText(file);
        // Reset input
        e.target.value = '';
    };

    return (
        <nav className="navbar navbar-expand-lg navbar-dark bg-dark mb-4 shadow-sm">
            <div className="container">
                <Link className="navbar-brand d-flex align-items-center gap-2 fw-bold text-uppercase" href="/">
                    <div className="bg-primary rounded px-2 py-1 d-flex justify-content-center align-items-center text-white small">
                        D
                    </div>
                    <span>DBANK</span>
                </Link>

                <div className="d-flex align-items-center gap-3">
                    <ul className="navbar-nav flex-row gap-3">
                        <li className="nav-item">
                            <Link className={`nav-link d-flex align-items-center gap-1 ${pathname === '/' ? 'active text-primary' : ''}`} href="/">
                                <LayoutDashboard size={18} />
                                <span className="d-none d-sm-inline">Özet</span>
                            </Link>
                        </li>
                        <li className="nav-item">
                            <Link className={`nav-link d-flex align-items-center gap-1 ${pathname === '/transactions' ? 'active text-primary' : ''}`} href="/transactions">
                                <History size={18} />
                                <span className="d-none d-sm-inline">Geçmiş</span>
                            </Link>
                        </li>
                        <li className="nav-item">
                            <Link className={`nav-link d-flex align-items-center gap-1 ${pathname === '/analiz' ? 'active text-primary' : ''}`} href="/analiz">
                                <TrendingUp size={18} />
                                <span className="d-none d-sm-inline">Analizler</span>
                            </Link>
                        </li>
                        <li className="nav-item">
                            <Link className={`nav-link d-flex align-items-center gap-1 ${pathname === '/kaynak-secimi' ? 'active text-primary' : ''}`} href="/kaynak-secimi">
                                <Settings size={18} />
                                <span className="d-none d-sm-inline">Kaynak Seçimi</span>
                            </Link>
                        </li>

                        {/* Admin Link - Only visible if role is admin */}
                        {session?.user?.role === 'admin' && (
                            <li className="nav-item border-start border-secondary ps-3 ms-2">
                                <Link className={`nav-link d-flex align-items-center gap-1 ${pathname === '/admin' ? 'active text-primary' : 'text-warning'}`} href="/admin">
                                    <span className="d-none d-sm-inline">YÖNETİCİ</span>
                                </Link>
                            </li>
                        )}
                    </ul>

                    <div className="d-flex align-items-center gap-2 border-start border-secondary ps-3 ms-1">
                        {/* Data Tools */}
                        <div className="d-flex align-items-center gap-1 me-2">
                            <button
                                onClick={exportData}
                                className="btn btn-outline-light btn-sm p-1 border-0 opacity-75"
                                title="Verileri Yedekle"
                            >
                                <Download size={18} />
                            </button>
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="btn btn-outline-light btn-sm p-1 border-0 opacity-75"
                                title="Yedek Yükle"
                            >
                                <Upload size={18} />
                            </button>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleImport}
                                accept=".json"
                                style={{ display: 'none' }}
                            />
                        </div>

                        <Link href="/add" className="btn btn-primary btn-sm d-flex align-items-center gap-1 rounded-pill px-3">
                            <PlusCircle size={16} />
                            <span className="d-none d-sm-inline">Ekle</span>
                        </Link>

                        {/* Sign Out */}
                        {session && (
                            <button
                                onClick={() => signOut({ callbackUrl: '/login' })}
                                className="btn btn-sm btn-link text-white-50 text-decoration-none ms-2 p-0"
                                title="Çıkış Yap"
                            >
                                Çıkış
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
}
