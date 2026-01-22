const yf = require('yahoo-finance2');
console.log('Type of default export:', typeof yf);
console.log('Keys:', Object.keys(yf));
console.log('yf.default:', typeof yf.default);
if (yf.default) console.log('Keys of default:', Object.keys(yf.default));
