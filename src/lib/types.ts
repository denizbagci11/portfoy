export type TransactionType = 'BUY' | 'SELL';

export interface Transaction {
    id: string;
    type: TransactionType;
    asset: string;      // 'GOLD', 'USD', 'EUR', 'XU100' ...
    date: string;       // ISO Date String YYYY-MM-DD
    amount: number;     // Generic Amount (Gram, Lot, Adet)
    amountGram: number; // Deprecated, kept for backward compatibility alias to amount
    priceTRY: number;   // Birim Fiyat (TL)
    usdRate: number;    // USD/TRY Kuru
    userId?: string;    // User ID owner

    // Hesaplanan/Türetilen
    totalTRY: number;
    totalUSD: number;
    priceUSD: number;   // priceTRY / usdRate
}

export interface User {
    id: string;
    username: string;
    name?: string | null;
    role: string;
}

export interface PortfolioStats {
    // ...
    totalGram: number;
    totalValueUSD: number;     // Güncel kur ile
    totalCostUSD: number;      // Tarihsel maliyet
    averageCostUSD: number;    // totalCostUSD / totalGram
    profitUSD: number;         // totalValueUSD - totalCostUSD
    profitRatio: number;       // profitUSD / totalCostUSD
    xirr: number;              // Yıllıklandırılmış getiri
}

export interface AssetSettings {
    driver: string;
    manualPrice?: number | null;
    priceCurrency?: string | null;
}

export interface UserPreferences {
    [key: string]: string;
}
