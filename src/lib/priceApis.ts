import YahooFinance from 'yahoo-finance2';

import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance({
    suppressNotices: ['yahooSurvey'],
    fetchOptions: {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
    }
});

/**
 * Price API Integration Utilities
 * Fetches asset prices from Yahoo Finance and TEFAS
 */

/**
 * Fetch price from Yahoo Finance
 * @param ticker - Yahoo Finance ticker symbol (e.g., "GC=F" for gold, "AKBNK.IS" for Akbank)
 * @returns Price in USD or null if failed
 */
export async function fetchYahooFinancePrice(ticker: string): Promise<number | null> {
    try {
        // Suppress console warnings from the library if necessary
        // yahooFinance.suppressNotices(['yahooSurvey']);

        const result = await yahooFinance.quote(ticker);

        if (!result) {
            console.error(`Yahoo Finance: No result for ${ticker}`);
            return null;
        }

        // regularMarketPrice is the standard field for current price
        const price = result.regularMarketPrice;

        if (typeof price === 'number' && !isNaN(price)) {
            console.log(`Successfully fetched ${ticker} via yahoo-finance2: ${price}`);
            return price;
        }

        console.error('Yahoo Finance: Price is missing or invalid for:', ticker);
        return null;
    } catch (error: any) {
        console.error('Error fetching Yahoo Finance price for ticker:', ticker, error.message || error);
        return null;
    }
}

/**
 * Fetch price from TEFAS using web scraping
 * @param fundCode - TEFAS fund code (e.g., "AK2", "AAK")
 * @returns Price in TRY or null if failed
 */
export async function fetchTefasPrice(fundCode: string): Promise<number | null> {
    try {
        // TEFAS fund analysis page URL
        const url = `https://www.tefas.gov.tr/FonAnaliz.aspx?FonKod=${fundCode.toUpperCase()}`;

        // Enhanced headers to look more like a real browser
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache',
                'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
                'Sec-Ch-Ua-Mobile': '?0',
                'Sec-Ch-Ua-Platform': '"Windows"',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'none',
                'Sec-Fetch-User': '?1',
                'Upgrade-Insecure-Requests': '1'
            }
        });

        if (!response.ok) {
            console.error(`TEFAS page error: ${response.status}`);
            return null;
        }

        const html = await response.text();

        // Try multiple patterns to find the price
        let priceStr: string | null = null;

        // Pattern 1: MainContent_FormViewMainIndicators_LabelPrice
        const pattern1 = /id="MainContent_FormViewMainIndicators_LabelPrice"[^>]*>([0-9.,]+)</;
        const match1 = html.match(pattern1);
        if (match1 && match1[1]) {
            priceStr = match1[1];
        }

        // Pattern 2: "Son Fiyat (TL)" followed by whitespace and price
        if (!priceStr) {
            const pattern2 = /Son Fiyat \(TL\)[\s\S]*?([0-9]+[.,][0-9]+)/;
            const match2 = html.match(pattern2);
            if (match2 && match2[1]) {
                priceStr = match2[1];
            }
        }

        // Pattern 3: Just look for "Son Fiyat" and grab next number
        if (!priceStr) {
            const pattern3 = /Son Fiyat[^0-9]*([0-9]+[.,][0-9]+)/;
            const match3 = html.match(pattern3);
            if (match3 && match3[1]) {
                priceStr = match3[1];
            }
        }

        if (priceStr) {
            // Replace comma with dot for parsing (Turkish number format uses comma)
            const price = parseFloat(priceStr.replace(',', '.'));

            if (!isNaN(price)) {
                return price;
            }
        }

        console.error('Could not find price in TEFAS page HTML');
        return null;
    } catch (error) {
        console.error('Error fetching TEFAS price:', error);
        return null;
    }
}

/**
 * Fetch price based on source configuration
 * @param source - Data source type
 * @param ticker - Ticker/fund code
 * @returns Object with price and currency, or null if failed
 */
export async function fetchPriceFromSource(
    source: 'TEFAS' | 'YAHOO',
    ticker: string
): Promise<{ price: number; currency: 'USD' | 'TRY' } | null> {
    if (!ticker) {
        console.error('No ticker provided');
        return null;
    }

    if (source === 'YAHOO') {
        const price = await fetchYahooFinancePrice(ticker);
        return price !== null ? { price, currency: 'USD' } : null;
    } else if (source === 'TEFAS') {
        const price = await fetchTefasPrice(ticker);
        return price !== null ? { price, currency: 'TRY' } : null;
    }

    return null;
}
