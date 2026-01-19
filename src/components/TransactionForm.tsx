"use client";

import { useState, useEffect, Suspense } from 'react';
import { usePortfolio } from '@/lib/store';
import { useRouter, useSearchParams } from 'next/navigation';
import { Save } from 'lucide-react';

function TransactionFormContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const editId = searchParams.get('edit');
    const { addTransaction, updateTransaction, transactions } = usePortfolio();

    const [formData, setFormData] = useState({
        type: 'BUY' as 'BUY' | 'SELL',
        asset: '',
        date: new Date().toISOString().split('T')[0],
        amount: '',
        priceTRY: '',
        usdRate: '33.50',
    });

    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const isBuy = formData.type === 'BUY';

    // Edit Mode: Load existing transaction data
    useEffect(() => {
        if (editId && transactions.length > 0) {
            const existing = transactions.find(t => t.id === editId);
            if (existing) {
                setFormData({
                    type: existing.type,
                    asset: existing.asset,
                    date: existing.date,
                    amount: existing.amount.toString(),
                    priceTRY: existing.priceTRY.toString(),
                    usdRate: existing.usdRate.toString(),
                });
            }
        }
    }, [editId, transactions]);

    // Auto-fetch USD rate when date changes (Only for NEW transactions)
    useEffect(() => {
        const fetchRate = async () => {
            // Don't auto-fetch if we are in edit mode to preserve user input
            if (!formData.date || editId) return;

            try {
                const res = await fetch(`https://api.frankfurter.app/${formData.date}?from=USD&to=TRY`);
                if (!res.ok) return;

                const data = await res.json();
                if (data.rates && data.rates.TRY) {
                    setFormData(prev => ({
                        ...prev,
                        usdRate: data.rates.TRY.toFixed(4)
                    }));
                }
            } catch (error) {
                console.error("Error fetching historical rate:", error);
            }
        };

        fetchRate();
    }, [formData.date, editId]);

    // Force Price to 1 if Asset is TRY, or Sync price and rate for USD
    useEffect(() => {
        const asset = formData.asset.toUpperCase();
        if (asset === 'TRY') {
            setFormData(prev => ({ ...prev, priceTRY: '1' }));
        } else if (asset === 'USD') {
            // If asset is USD, Birim Fiyat (TL) must equal Dolar Kuru
            setFormData(prev => ({ ...prev, priceTRY: prev.usdRate }));
        }
    }, [formData.asset, formData.usdRate]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const amount = parseFloat(formData.amount);
        const priceTRY = parseFloat(formData.priceTRY);
        const usdRate = parseFloat(formData.usdRate);

        if (!formData.asset || amount <= 0 || priceTRY <= 0 || usdRate <= 0) {
            alert("Lütfen tüm alanları doğru doldurun.");
            return;
        }

        const transactionData = {
            id: editId || crypto.randomUUID(),
            type: formData.type,
            asset: formData.asset.trim().toUpperCase(),
            date: formData.date,
            amount,
            amountGram: amount,
            priceTRY,
            usdRate,
            totalTRY: amount * priceTRY,
            totalUSD: (amount * priceTRY) / usdRate,
            priceUSD: priceTRY / usdRate,
        };

        if (editId) {
            updateTransaction(transactionData);
            router.push('/');
        } else {
            addTransaction(transactionData);

            // Show success message
            const typeText = formData.type === 'BUY' ? 'Alımı' : 'Satımı';
            setSuccessMessage(`${amount} ${formData.asset.toUpperCase()} ${typeText} Başarıyla Kaydedildi.`);

            // Reset form for next entry (keep date and rate for convenience)
            setFormData(prev => ({
                ...prev,
                asset: '',
                amount: '',
                priceTRY: '',
            }));

            // Auto-clear message
            setTimeout(() => setSuccessMessage(null), 5000);
        }
    };

    return (
        <div className="row justify-content-center">
            <div className="col-md-8 col-lg-6">
                <div className="card shadow border-0">
                    <div className="card-header bg-primary text-white py-3">
                        <h5 className="mb-0 fw-bold">
                            {editId ? 'İşlemi Düzenle' : 'Yeni İşlem Ekle'}
                        </h5>
                    </div>
                    <div className="card-body p-4">
                        {successMessage && (
                            <div className="alert alert-success alert-dismissible fade show mb-4 shadow-sm border-0 bg-success text-white py-3 d-flex align-items-center justify-content-between" role="alert">
                                <div className="d-flex align-items-center gap-2">
                                    <div className="bg-white text-success rounded-circle d-flex align-items-center justify-content-center" style={{ width: 24, height: 24 }}>✓</div>
                                    <span className="fw-bold">{successMessage}</span>
                                </div>
                                <button type="button" className="btn-close btn-close-white shadow-none" onClick={() => setSuccessMessage(null)} aria-label="Close"></button>
                            </div>
                        )}
                        <form onSubmit={handleSubmit}>
                            {/* Type Toggle */}
                            <div className="btn-group w-100 mb-4" role="group">
                                <input
                                    type="radio"
                                    className="btn-check"
                                    name="type"
                                    id="buy"
                                    checked={isBuy}
                                    onChange={() => setFormData({ ...formData, type: 'BUY' })}
                                />
                                <label className={`btn ${isBuy ? 'btn-success text-white' : 'btn-outline-secondary'}`} htmlFor="buy">ALIM YAPTIM</label>

                                <input
                                    type="radio"
                                    className="btn-check"
                                    name="type"
                                    id="sell"
                                    checked={!isBuy}
                                    onChange={() => setFormData({ ...formData, type: 'SELL' })}
                                />
                                <label className={`btn ${!isBuy ? 'btn-danger text-white' : 'btn-outline-secondary'}`} htmlFor="sell">SATIM YAPTIM</label>
                            </div>

                            <div className="row g-3">
                                <div className="col-md-6">
                                    <label className="form-label text-muted small fw-bold text-uppercase">Varlık Kodu</label>
                                    <input
                                        type="text"
                                        list="assets"
                                        className="form-control form-control-lg fw-bold text-uppercase"
                                        placeholder="Örn: BTC"
                                        value={formData.asset}
                                        onChange={e => setFormData({ ...formData, asset: e.target.value })}
                                        required
                                    />
                                    <datalist id="assets">
                                        <option value="GOLD" />
                                        <option value="USD" />
                                        <option value="EUR" />
                                        <option value="GBP" />
                                        <option value="XU100" />
                                        <option value="BTC" />
                                        <option value="TRY" />
                                        <option value="XPT" />
                                    </datalist>
                                    <div className="form-text mt-1 text-muted small">
                                        Vadesiz TRY, USD, EUR, GBP varlıklarınız için kutuya adını yazmanız yeterlidir. Örn: TRY için <b>TRY</b>.
                                    </div>
                                </div>

                                <div className="col-md-6">
                                    <label className="form-label text-muted small fw-bold text-uppercase">Tarih</label>
                                    <input
                                        type="date"
                                        className="form-control form-control-lg"
                                        value={formData.date}
                                        onChange={e => setFormData({ ...formData, date: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="col-md-4">
                                    <label className="form-label text-muted small fw-bold text-uppercase">Miktar</label>
                                    <input
                                        type="number"
                                        className="form-control"
                                        placeholder="0.00"
                                        step="any"
                                        value={formData.amount}
                                        onChange={e => setFormData({ ...formData, amount: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="col-md-4">
                                    <label className="form-label text-muted small fw-bold text-uppercase">Birim Fiyat (TL)</label>
                                    <div className="input-group">
                                        <span className="input-group-text">₺</span>
                                        <input
                                            type="number"
                                            className="form-control"
                                            placeholder="0.00"
                                            step="any"
                                            value={formData.asset.toUpperCase() === 'TRY' ? '1' : formData.priceTRY}
                                            onChange={e => setFormData({ ...formData, priceTRY: e.target.value })}
                                            required
                                            disabled={formData.asset.toUpperCase() === 'TRY' || formData.asset.toUpperCase() === 'USD'}
                                        />
                                    </div>
                                </div>

                                <div className="col-md-4">
                                    <label className="form-label text-muted small fw-bold text-uppercase">Dolar Kuru</label>
                                    <div className="input-group">
                                        <span className="input-group-text">$</span>
                                        <input
                                            type="number"
                                            className="form-control"
                                            value={formData.usdRate}
                                            onChange={e => setFormData({ ...formData, usdRate: e.target.value })}
                                            required
                                            disabled={formData.asset.toUpperCase() === 'TRY' && !editId}
                                        />
                                    </div>
                                </div>
                            </div>

                            <hr className="my-4" />

                            <button type="submit" className="btn btn-primary w-100 py-3 fw-bold d-flex align-items-center justify-content-center gap-2">
                                <Save size={20} />
                                {editId ? 'GÜNCELLE' : 'İŞLEMİ KAYDET'}
                            </button>
                        </form>
                    </div>
                </div>
            </div >
        </div >
    );
}

export default function TransactionForm() {
    return (
        <Suspense fallback={<div>Yükleniyor...</div>}>
            <TransactionFormContent />
        </Suspense>
    );
}
