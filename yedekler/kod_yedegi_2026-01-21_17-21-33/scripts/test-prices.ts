import { fetchYahooFinancePrice, fetchTefasPrice } from '../src/lib/priceApis';

async function testPrices() {
    console.log('Testing Yahoo Finance...');
    const tickers = ['AAPL', 'GC=F', 'AKBNK.IS'];
    for (const ticker of tickers) {
        try {
            const price = await fetchYahooFinancePrice(ticker);
            console.log(`${ticker}: ${price}`);
        } catch (error) {
            console.error(`${ticker}: Failed`, error);
        }
    }

    console.log('\nTesting TEFAS...');
    const funds = ['AK2', 'TCD'];
    for (const fund of funds) {
        try {
            const price = await fetchTefasPrice(fund);
            console.log(`${fund}: ${price}`);
        } catch (error) {
            console.error(`${fund}: Failed`, error);
        }
    }
}

testPrices();
