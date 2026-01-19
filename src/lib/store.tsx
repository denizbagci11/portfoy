"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Transaction } from './types';
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

export function PortfolioProvider({ children }: { children: React.ReactNode }) {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [assetDrivers, setAssetDrivers] = useState<Record<string, 'USD' | 'TRY'>>({});
    const [isLoading, setIsLoading] = useState(true);

    // Initial load from Database
    useEffect(() => {
        const loadFromDB = async () => {
            setIsLoading(true);
            try {
                const [dbTransactions, dbSettings] = await Promise.all([
                    getTransactions(),
                    getAssetSettings()
                ]);

                // @ts-ignore
                setTransactions(dbTransactions);
                // @ts-ignore
                setAssetDrivers(dbSettings);
            } catch (err) {
                console.error("Failed to load data from DB:", err);
            } finally {
                setIsLoading(false);
            }
        };

        loadFromDB();
    }, []);

    const addTransaction = async (transaction: Transaction) => {
        // Optimistic update
        setTransactions(prev => [transaction, ...prev]);

        const result = await addTransactionAction(transaction);
        if (!result.success) {
            // Revert on failure
            setTransactions(prev => prev.filter(t => t.id !== transaction.id));
            alert("İşlem kaydedilemedi. Lütfen tekrar deneyin.");
        } else {
            // Update with real ID if cuid was generated server side
            // (Our client side generates it too, but just in case)
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
    );
}

export function usePortfolio() {
    const context = useContext(PortfolioContext);
    if (context === undefined) {
        throw new Error('usePortfolio must be used within a PortfolioProvider');
    }
    return context;
}
