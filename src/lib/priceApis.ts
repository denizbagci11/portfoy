/**
 * Price API Integration Utilities
 * Fetches asset prices from Yahoo Finance and TEFAS
 */

/**
 * Fetch price from Yahoo Finance
 * @param ticker - Yahoo Finance ticker symbol (e.g., "GC=F" for gold, "AAPL" for Apple)
 * @returns Price in USD or null if failed
 */
export async function fetchYahooFinancePrice(ticker: string): Promise<number | null> {
    try {
        // Using Yahoo Finance v8 API (unofficial but widely used)
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}`;

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0'
            }
        });

        if (!response.ok) {
            console.error(`Yahoo Finance API error: ${response.status}`);
            return null;
        }

        const data = await response.json();

        // Extract current price from response
        const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice;

        if (typeof price === 'number' && !isNaN(price)) {
            return price;
        }

        console.error('Invalid price data from Yahoo Finance');
        return null;
    } catch (error) {
        console.error('Error fetching Yahoo Finance price:', error);
        return null;
    }
}

/**
 * Fetch price from TEFAS
 * @param fundCode - TEFAS fund code (e.g., "AAK", "AFK")
 * @returns Price in TRY or null if failed
 */
export async function fetchTefasPrice(fundCode: string): Promise<number | null> {
    try {
        // TEFAS API endpoint (unofficial)
        const url = `https://www.tefas.gov.tr/api/DB/BindHistoryInfo`;

        const today = new Date();
        const formattedDate = today.toISOString().split('T')[0]; // YYYY-MM-DD

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'Mozilla/5.0'
            },
            body: new URLSearchParams({
                fontip: fundCode.toUpperCase(),
                bastarih: formattedDate,
                bittarih: formattedDate,
                fonturkod: ''
            })
        });

        if (!response.ok) {
            console.error(`TEFAS API error: ${response.status}`);
            return null;
        }

        const data = await response.json();

        // Extract price from response
        // TEFAS returns array of fund data, we want the latest price
        if (data?.data && Array.isArray(data.data) && data.data.length > 0) {
            const latestData = data.data[0];
            const price = parseFloat(latestData.FIYAT);

            if (!isNaN(price)) {
                return price;
            }
        }

        console.error('Invalid price data from TEFAS');
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
