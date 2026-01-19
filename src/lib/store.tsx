"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Transaction, AssetSettings, UserPreferences } from './types';
import { SessionProvider, useSession } from 'next-auth/react';
import {
    getTransactions,
    addTransactionAction,
    removeTransactionAction,
    updateTransactionAction,
    getAssetSettings,
    updateAssetDriverAction,
    getUserPreferencesAction,
    saveUserPreferenceAction,
    updateAssetPriceAction
} from '@/actions';

interface PortfolioContextType {
    transactions: Transaction[];
    addTransaction: (transaction: Transaction) => void;
    updateTransaction: (transaction: Transaction) => void;
    removeTransaction: (id: string) => void;

    assetSettings: Record<string, AssetSettings>;
    updateDriver: (asset: string, driver: 'USD' | 'TRY') => void;
    updateAssetPrice: (asset: string, price: number, currency: string) => void;

    userPreferences: UserPreferences;
    saveUserPreference: (key: string, value: string) => void;

    isLoading: boolean;
    exportData: () => void;
    importData: (jsonData: string) => void;
}

const PortfolioContext = createContext<PortfolioContextType | undefined>(undefined);

function DataLoader({
    setTransactions,
    setAssetSettings,
    setUserPreferences,
    setIsLoading
}: {
    setTransactions: any,
    setAssetSettings: any,
    setUserPreferences: any,
    setIsLoading: any
}) {
    const { data: session, status } = useSession();

    useEffect(() => {
        const loadFromDB = async () => {
            if (status === 'unauthenticated') {
                setTransactions([]);
                setAssetSettings({});
                setUserPreferences({});
                setIsLoading(false);
                return;
            }

            if (status === 'authenticated') {
                setIsLoading(true);
                try {
                    const [dbTransactions, dbSettings, dbPrefs] = await Promise.all([
                        getTransactions(),
                        getAssetSettings(),
                        getUserPreferencesAction()
                    ]);
                    setTransactions(dbTransactions);
                    setAssetSettings(dbSettings);
                    setUserPreferences(dbPrefs);
                } catch (err) {
                    console.error("Failed to load data from DB:", err);
                } finally {
                    setIsLoading(false);
                }
            }
        };

        loadFromDB();
    }, [status, session?.user?.id, setTransactions, setAssetSettings, setUserPreferences, setIsLoading]);

    return null;
}

export function PortfolioProvider({ children }: { children: React.ReactNode }) {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [assetSettings, setAssetSettings] = useState<Record<string, AssetSettings>>({});
    const [userPreferences, setUserPreferences] = useState<UserPreferences>({});
    const [isLoading, setIsLoading] = useState(true);

    const addTransaction = async (transaction: Transaction) => {
        // Optimistic
        setTransactions(prev => [transaction, ...prev]);

        const result = await addTransactionAction(transaction);
        if (!result.success) {
            setTransactions(prev => prev.filter(t => t.id !== transaction.id));
            alert("İşlem kaydedilemedi: " + (result.error || "Bilinmeyen hata"));
        } else if (result.id) {
            setTransactions(prev => prev.map(t => t.id === transaction.id ? { ...t, id: result.id! } : t));
        }
    };

    const updateTransaction = async (updated: Transaction) => {
        const original = transactions.find(t => t.id === updated.id);
        setTransactions(prev => prev.map(t => t.id === updated.id ? updated : t));

        const result = await updateTransactionAction(updated);
        if (!result.success && original) {
            setTransactions(prev => prev.map(t => t.id === updated.id ? original : t));
            alert("Güncelleme başarısız.");
        }
    };

    const removeTransaction = async (id: string) => {
        const itemToRemove = transactions.find(t => t.id === id);
        setTransactions(prev => prev.filter(t => t.id !== id));

        const result = await removeTransactionAction(id);
        if (!result.success && itemToRemove) {
            setTransactions(prev => [itemToRemove, ...prev]);
            alert("Silme işlemi başarısız.");
        }
    };

    const updateDriver = async (asset: string, driver: 'USD' | 'TRY') => {
        const original = assetSettings[asset];
        setAssetSettings(prev => ({
            ...prev,
            [asset]: { ...(prev[asset] || {}), driver }
        }));

        const result = await updateAssetDriverAction(asset, driver);
        if (!result.success) {
            setAssetSettings(prev => ({ ...prev, [asset]: original }));
            alert("Ayarlar kaydedilemedi.");
        }
    };

    const updateAssetPrice = async (asset: string, price: number, currency: string) => {
        const original = assetSettings[asset];
        setAssetSettings(prev => ({
            ...prev,
            [asset]: { ...(prev[asset] || { driver: 'USD' }), manualPrice: price, priceCurrency: currency }
        }));

        const result = await updateAssetPriceAction(asset, price, currency);
        if (!result.success) {
            setAssetSettings(prev => ({ ...prev, [asset]: original }));
            alert("Fiyat güncellenemedi.");
        }
    };

    const saveUserPreference = async (key: string, value: string) => {
        setUserPreferences(prev => ({ ...prev, [key]: value }));
        await saveUserPreferenceAction(key, value);
    };

    const exportData = () => {
        const data = {
            transactions,
            assetSettings,
            userPreferences,
            exportedAt: new Date().toISOString(),
            version: '2.1 (Cloud)'
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `portfoy_yedek_bulut_${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const importData = async (jsonData: string) => {
        try {
            const data = JSON.parse(jsonData);
            if (!data.transactions || !Array.isArray(data.transactions)) {
                throw new Error("Geçersiz veri formatı.");
            }
            alert("Toplu içe aktarma şu an için devre dışı. Lütfen teknik desteğe başvurun.");
        } catch (e) {
            console.error("Yükleme hatası:", e);
        }
    };

    return (
        <SessionProvider>
            <DataLoader
                setTransactions={setTransactions}
                setAssetSettings={setAssetSettings}
                setUserPreferences={setUserPreferences}
                setIsLoading={setIsLoading}
            />
            <PortfolioContext.Provider value={{
                transactions,
                addTransaction,
                updateTransaction,
                removeTransaction,
                assetSettings,
                updateDriver,
                updateAssetPrice,
                userPreferences,
                saveUserPreference,
                isLoading,
                exportData,
                importData
            }}>
                {children}
            </PortfolioContext.Provider>
        </SessionProvider>
    );
}

export function usePortfolio() {
    const context = useContext(PortfolioContext);
    if (context === undefined) {
        throw new Error('usePortfolio must be used within a PortfolioProvider');
    }
    return context;
}
