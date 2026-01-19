"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Transaction } from './types';
import { initialTransactions } from './seedData';

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

    // Load from LocalStorage
    useEffect(() => {
        const stored = localStorage.getItem('portfolio_transactions');
        const storedDrivers = localStorage.getItem('portfolio_asset_drivers');

        if (storedDrivers) {
            try {
                setAssetDrivers(JSON.parse(storedDrivers));
            } catch (e) {
                console.error("Failed to parse asset drivers", e);
            }
        }

        let loadedTransactions: Transaction[] = [];

        if (stored) {
            try {
                const rawData = JSON.parse(stored);
                // MIGRATION LOGIC:
                loadedTransactions = rawData.map((t: any) => {
                    const amount = t.amount !== undefined ? Number(t.amount) : Number(t.amountGram || 0);
                    return {
                        ...t,
                        asset: (t.asset || 'GOLD').trim().toUpperCase(), // Normalize
                        amount: amount,
                        amountGram: amount, // Keep sync
                        priceTRY: Number(t.priceTRY || 0),
                        usdRate: Number(t.usdRate || 0),
                        totalTRY: Number(t.totalTRY || 0),
                        totalUSD: Number(t.totalUSD || 0)
                    };
                });
            } catch (e) {
                console.error("Failed to parse transactions", e);
            }
        }

        // "Database'e ekle" logic: 
        // Check if we already imported these (check for 'imported_1' as a marker)
        // If NOT imported, MERGE them.
        const hasImportedData = loadedTransactions.some(t => t.id && t.id.startsWith('imported_'));

        if (!hasImportedData) {
            console.log("Importing CSV seed data...");
            // Migrate seed data too
            const migratedSeed = initialTransactions.map((t: any) => ({
                ...t,
                asset: 'GOLD',
                amount: t.amountGram,
                amountGram: t.amountGram
            }));

            loadedTransactions = [...loadedTransactions, ...migratedSeed];
            // Sort by date just in case
            loadedTransactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        }

        setTransactions(loadedTransactions);
        setIsLoading(false);
    }, []);

    // Save to LocalStorage
    useEffect(() => {
        if (!isLoading) {
            localStorage.setItem('portfolio_transactions', JSON.stringify(transactions));
        }
    }, [transactions, isLoading]);

    const addTransaction = (transaction: Transaction) => {
        setTransactions(prev => [transaction, ...prev]);
    };

    const updateTransaction = (updated: Transaction) => {
        setTransactions(prev => prev.map(t => t.id === updated.id ? updated : t));
    };

    const removeTransaction = (id: string) => {
        setTransactions(prev => prev.filter(t => t.id !== id));
    };

    const updateDriver = (asset: string, driver: 'USD' | 'TRY') => {
        setAssetDrivers(prev => {
            const updated = { ...prev, [asset]: driver };
            localStorage.setItem('portfolio_asset_drivers', JSON.stringify(updated));
            return updated;
        });
    };

    const exportData = () => {
        const data = {
            transactions,
            assetDrivers,
            exportedAt: new Date().toISOString(),
            version: '1.0'
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `portfoy_yedek_${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const importData = (jsonData: string) => {
        try {
            const data = JSON.parse(jsonData);

            // Basic validation
            if (!data.transactions || !Array.isArray(data.transactions)) {
                throw new Error("Geçersiz veri formatı: transactions bulunamadı.");
            }

            setTransactions(data.transactions);

            if (data.assetDrivers) {
                setAssetDrivers(data.assetDrivers);
                localStorage.setItem('portfolio_asset_drivers', JSON.stringify(data.assetDrivers));
            }

            // Note: transactions will be saved via the existing useEffect
            return true;
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
