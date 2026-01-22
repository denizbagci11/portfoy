const fs = require('fs');
const path = require('path');

const csvPath = "C:\\Users\\Deniz\\Downloads\\ekle.csv";

try {
    const data = fs.readFileSync(csvPath, 'utf8');
    const lines = data.split('\n').filter(l => l.trim() !== '');

    const transactions = [];
    // Skip header (line 0)
    for (let i = 1; i < lines.length; i++) {
        // CSV parsing is tricky with quoted commas "25,66". 
        // Simple split by ',' won't work.
        // Regex to split by comma ONLY if not inside quotes.
        const parts = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);

        // Manual strict splitting might be safer given the consistent structure
        // Let's use a simpler regex or character walk if regex fails. 
        // Actually, simply replacing "25,66" with 25.66 BEFORE splitting might be easier?
        // No, "25,66" is quoted.

        // Better regex for CSV:
        // /,(?=(?:(?:[^"]*"){2})*[^"]*$)/
        const cols = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);

        if (cols.length < 13) continue; // Skip empty or invalid lines

        // Mapping: A=0, D=3, J=9, L=11

        // 1. Date (A) -> 14.09.2018
        const dateRaw = cols[0].trim();
        if (!dateRaw || !dateRaw.includes('.')) continue;
        const [day, month, year] = dateRaw.split('.');
        const dateISO = `${year}-${month}-${day}`;

        // 2. Amount (D) -> "25,66" or -36,11
        let amountRaw = cols[3].replace(/"/g, '').replace(',', '.');
        let amount = parseFloat(amountRaw);
        if (isNaN(amount)) continue;

        // Determine Type
        const type = amount < 0 ? 'SELL' : 'BUY';
        const amountAbs = Math.abs(amount);

        // 3. Price TRY (J) -> "233,82 TRY"
        let priceRaw = cols[9].replace(/"/g, '').replace(' TRY', '').replace(' TL', '').trim().replace('.', '').replace(',', '.');
        // Note: Turkish format might use . for thousands and , for decimals: 5.999,82
        // So we remove . first, then replace , with .
        let priceTRY = parseFloat(priceRaw);

        // 4. USD Rate (L) -> "$6,17"
        let usdRaw = cols[11].replace(/"/g, '').replace('$', '').trim().replace(',', '.');
        let usdRate = parseFloat(usdRaw);

        if (isNaN(priceTRY) || isNaN(usdRate)) continue;

        const totalTRY = amountAbs * priceTRY;
        const id = `imported_${i}`; // Simple ID

        transactions.push({
            id,
            type,
            asset: 'GOLD',
            date: dateISO,
            amount: amountAbs, // Generic
            amountGram: amountAbs,
            priceTRY,
            usdRate,
            totalTRY,
            totalUSD: totalTRY / usdRate,
            priceUSD: priceTRY / usdRate
        });
    }

    // Write to src/lib/seedData.ts
    const tsContent = `import { Transaction } from './types';

export const initialTransactions: Transaction[] = ${JSON.stringify(transactions, null, 2)};`;

    const outputPath = path.join(__dirname, '../src/lib/seedData.ts');
    fs.writeFileSync(outputPath, tsContent);
    console.log(`Successfully wrote ${transactions.length} transactions to ${outputPath}`);

} catch (err) {
    console.error("Error:", err.message);
}
