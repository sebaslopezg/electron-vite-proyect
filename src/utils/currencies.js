export const CURRENCIES = [
    { code: 'COP', symbol: '$', label: 'Peso Colombiano (COP)' },
    { code: 'USD', symbol: '$', label: 'Dólar Estadounidense (USD)' },
    { code: 'MXN', symbol: '$', label: 'Peso Mexicano (MXN)' },
    { code: 'EUR', symbol: '€', label: 'Euro (EUR)' },
    { code: 'ARS', symbol: '$', label: 'Peso Argentino (ARS)' },
    { code: 'CLP', symbol: '$', label: 'Peso Chileno (CLP)' },
    { code: 'PEN', symbol: 'S/', label: 'Sol Peruano (PEN)' },
    { code: 'CRC', symbol: '₡', label: 'Colón Costarricense (CRC)' }
];

export const getCurrencySymbol = (code) => {
    const currency = CURRENCIES.find(c => c.code === code);
    return currency ? currency.symbol : '$'; 
};

export const formatCurrency = (val, locale = 'es-CO', currencyCode = 'COP') => {
    const numeroFormateado = new Intl.NumberFormat(locale, { 
        style: 'decimal', 
        minimumFractionDigits: 0,
        maximumFractionDigits: 2 
    }).format(val || 0);
    
    const simbolo = getCurrencySymbol(currencyCode);
    return `${simbolo}${numeroFormateado}`;
};