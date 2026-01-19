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
        // Using Yahoo Finance v8 API (unofficial but widely used)
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}`;

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'application/json',
                'Accept-Language': 'en-US,en;q=0.9'
            }
        });

        if (!response.ok) {
            console.error(`Yahoo Finance API error: ${response.status} for ticker ${ticker}`);
            const text = await response.text();
            console.error('Response:', text.substring(0, 200));
            return null;
        }

        const data = await response.json();

        // Extract current price from response
        const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice;

        if (typeof price === 'number' && !isNaN(price)) {
            console.log(`Successfully fetched ${ticker}: ${price}`);
            return price;
        }

        console.error('Invalid price data from Yahoo Finance for ticker:', ticker);
        console.error('Response structure:', JSON.stringify(data).substring(0, 300));
        return null;
    } catch (error) {
        console.error('Error fetching Yahoo Finance price for ticker:', ticker, error);
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

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
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
