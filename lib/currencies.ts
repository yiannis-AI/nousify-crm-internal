export const CURRENCIES = [
  { code: 'USD', symbol: '$',    label: 'US Dollar (USD)' },
  { code: 'EUR', symbol: '€',    label: 'Euro (EUR)' },
  { code: 'GBP', symbol: '£',    label: 'British Pound (GBP)' },
  { code: 'CAD', symbol: 'C$',   label: 'Canadian Dollar (CAD)' },
  { code: 'AUD', symbol: 'A$',   label: 'Australian Dollar (AUD)' },
  { code: 'SGD', symbol: 'S$',   label: 'Singapore Dollar (SGD)' },
  { code: 'CHF', symbol: 'CHF',  label: 'Swiss Franc (CHF)' },
  { code: 'JPY', symbol: '¥',    label: 'Japanese Yen (JPY)' },
  { code: 'INR', symbol: '₹',    label: 'Indian Rupee (INR)' },
  { code: 'BRL', symbol: 'R$',   label: 'Brazilian Real (BRL)' },
  { code: 'MXN', symbol: 'MX$',  label: 'Mexican Peso (MXN)' },
  { code: 'AED', symbol: 'AED',  label: 'UAE Dirham (AED)' },
  { code: 'NOK', symbol: 'kr',   label: 'Norwegian Krone (NOK)' },
  { code: 'SEK', symbol: 'kr',   label: 'Swedish Krona (SEK)' },
  { code: 'DKK', symbol: 'kr',   label: 'Danish Krone (DKK)' },
]

export function getCurrencySymbol(code: string): string {
  return CURRENCIES.find((c) => c.code === code)?.symbol ?? code
}
