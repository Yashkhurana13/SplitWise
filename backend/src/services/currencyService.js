// backend/src/services/currencyService.js

// Static mock exchange rates against base currency (INR)
// In a production app, this would call an API like Fixer.io
const EXCHANGE_RATES = {
  'USD': 83.5,
  'EUR': 90.2,
  'GBP': 105.4,
  'INR': 1.0
};

const convertToBaseCurrency = (amount, currencyCode, baseCurrency = 'INR') => {
  const code = currencyCode ? currencyCode.toUpperCase() : baseCurrency;
  
  if (code === baseCurrency) {
    return {
      convertedAmount: amount,
      exchangeRate: 1.0,
      originalCurrency: code
    };
  }

  const rate = EXCHANGE_RATES[code] || 1.0; // Fallback to 1.0 if unknown
  
  return {
    convertedAmount: amount * rate,
    exchangeRate: rate,
    originalCurrency: code
  };
};

module.exports = {
  convertToBaseCurrency,
  EXCHANGE_RATES
};
