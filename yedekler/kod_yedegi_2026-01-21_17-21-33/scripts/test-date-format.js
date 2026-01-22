// Test date formatting
const testDates = [
    '2025-12-31',
    '2026-01-31',
    '2026-01-01'
];

testDates.forEach(val => {
    try {
        const [year, month, day] = val.split('-').map(Number);
        const d = new Date(year, month - 1, day);
        const formatted = d.toLocaleDateString('tr-TR', { month: 'short', year: '2-digit' });
        const formattedLong = d.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });
        console.log(`${val} -> ${formatted} (${formattedLong})`);
    } catch (e) {
        console.log(`${val} -> ERROR: ${e.message}`);
    }
});
