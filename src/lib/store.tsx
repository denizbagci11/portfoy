"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Transaction } from './types';
import { SessionProvider, useSession } from 'next-auth/react';
import {
    getTransactions,
    addTransactionAction,
    removeTransactionAction,
    updateTransactionAction,
    getAssetSettings,
    updateAssetDriverAction
} from '@/actions';

interface PortfolioContextType {
    transactions: Transaction[];
    addTransaction: (transaction: Transaction) => void;
    updateTransaction: (transaction: Transaction) => void;
    removeTransaction: (id: string) => void;
    assetDrivers: Record<string, 'USD' | 'TRY'>;
    updateDriver: (asset: string, driver: 'USD' | 'TRY') => void;
    isLoading: boolean;
    exportData: () => void;
    importData: (jsonData: string) => void;
}

const PortfolioContext = createContext<PortfolioContextType | undefined>(undefined);

function DataLoader({
    setTransactions,
    setAssetDrivers,
    setIsLoading
}: {
    setTransactions: any,
    setAssetDrivers: any,
    setIsLoading: any
}) {
    const { data: session, status } = useSession();

    useEffect(() => {
        const loadFromDB = async () => {
            if (status === 'unauthenticated') {
                setTransactions([]);
                setAssetDrivers({});
                setIsLoading(false);
                return;
            }

            if (status === 'authenticated') {
                setIsLoading(true);
                try {
                    const [dbTransactions, dbSettings] = await Promise.all([
                        getTransactions(),
                        getAssetSettings()
                    ]);
                    setTransactions(dbTransactions);
                    setAssetDrivers(dbSettings);
                } catch (err) {
                    console.error("Failed to load data from DB:", err);
                } finally {
                    setIsLoading(false);
                }
            }
        };

        loadFromDB();
    }, [status, session?.user?.id, setTransactions, setAssetDrivers, setIsLoading]);

    return null;
}

export function PortfolioProvider({ children }: { children: React.ReactNode }) {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [assetDrivers, setAssetDrivers] = useState<Record<string, 'USD' | 'TRY'>>({});
    const [isLoading, setIsLoading] = useState(true);

    const addTransaction = async (transaction: Transaction) => {
        // ... (rest remains same)
        // Optimistic update
        setTransactions(prev => [transaction, ...prev]);

        const result = await addTransactionAction(transaction);
        if (!result.success) {
            // Revert on failure
            setTransactions(prev => prev.filter(t => t.id !== transaction.id));
            alert("İşlem kaydedilemedi: " + (result.error || "Bilinmeyen hata"));
        } else if (result.id) {
            // Update with real ID from server
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
        const original = assetDrivers[asset];
        setAssetDrivers(prev => ({ ...prev, [asset]: driver }));

        const result = await updateAssetDriverAction(asset, driver);
        if (!result.success) {
            setAssetDrivers(prev => ({ ...prev, [asset]: original }));
            alert("Ayarlar kaydedilemedi.");
        }
    };

    const exportData = () => {
        const data = {
            transactions,
            assetDrivers,
            exportedAt: new Date().toISOString(),
            version: '2.0 (DB)'
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

            // Bulk import logic could be complex, for now we let the user know 
            // they should use the migrate script or we'd need a bulk-add server action.
            // For safety, we just update local state and let them know it's a one-way sync for now.
            alert("Toplu içe aktarma şu an için devre dışı. Lütfen teknik desteğe başvurun.");
            return false;
        } catch (e) {
            console.error("Yükleme hatası:", e);
            throw e;
        }
    };

    return (
        <SessionProvider>
            <DataLoader
                setTransactions={setTransactions}
                setAssetDrivers={setAssetDrivers}
                setIsLoading={setIsLoading}
            />
            <PortfolioContext.Provider value={{
                transactions,
                addTransaction,
                updateTransaction,
                removeTransaction,
                assetDrivers,
                updateDriver,
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
